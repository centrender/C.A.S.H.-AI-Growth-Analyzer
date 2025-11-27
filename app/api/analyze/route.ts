import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { scrapeUrl } from '@/utils/scraper';
import { calculateCASHScoreV2, CASHScoreResult } from '@/utils/cash-scoring';
import { analyzeGMB } from '@/utils/gmb-analyzer';
import { logger } from '@/utils/logger';
import { AnalysisResult } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const requestId = logger.info('Analysis request received');

  try {
    const body = await request.json();
    const { url, email } = body;

    if (!url || typeof url !== 'string') {
      logger.warn('Invalid URL provided', { requestId, url });
      return NextResponse.json(
        { error: 'Valid URL is required', requestId },
        { status: 400 }
      );
    }

    // Email is optional but should be validated if provided
    if (email && typeof email !== 'string') {
      logger.warn('Invalid email format provided', { requestId, email });
      return NextResponse.json(
        { error: 'Invalid email format', requestId },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      logger.warn('Invalid URL format', { requestId, url });
      return NextResponse.json(
        { error: 'Invalid URL format', requestId },
        { status: 400 }
      );
    }

    logger.info('Starting URL scraping', { requestId, url });

    // Scrape the URL
    const scrapedContent = await scrapeUrl(url);
    logger.info('Scraping completed', {
      requestId,
      title: scrapedContent.title,
      headingsCount: scrapedContent.headings.length,
      textLength: scrapedContent.text.length
    });

    // Analyze GMB Profile
    logger.info('Analyzing GMB Profile', { requestId });
    const gmbProfile = await analyzeGMB(scrapedContent.html || '', scrapedContent.title);
    logger.info('GMB Analysis completed', { requestId, found: gmbProfile.found, score: gmbProfile.score });

    // Calculate CASH v2 scores
    logger.info('Calculating CASH v2 scores', { requestId });
    const scoreResult = calculateCASHScoreV2(scrapedContent, gmbProfile);
    logger.info('CASH v2 scores calculated', { requestId, scores: scoreResult.scores });

    // Generate AI summary
    logger.info('Generating AI summary', { requestId });
    const aiSummary = await generateAISummary(scrapedContent, scoreResult, requestId);

    // Prepare result
    const result: AnalysisResult = {
      requestId,
      url,
      timestamp: new Date().toISOString(),
      clientEmail: email || undefined, // Store verified email for future Google Sheet export
      detectedBusinessType: scoreResult.detectedBusinessType || undefined, // For VAPI CTA
      scores: scoreResult.scores,
      signals: scoreResult.signals,
      priorityIssues: scoreResult.priorityIssues,
      offers: scoreResult.offers,
      aiSummary,
      gmbProfile,
      // Keep for backward compatibility
      scrapedContent,
    };

    // Send data to Google Sheet Webhook (if configured)
    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        logger.info('Sending data to Google Sheet Webhook', { requestId });
        // Don't await the fetch to avoid blocking the response? 
        // Actually, Vercel serverless functions might freeze execution after response.
        // It's safer to await it for reliability, or use waitUntil if available (Edge).
        // Given this is standard Node, we'll await with a short timeout or just await.
        // Since it's a critical lead capture, we should await.
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        });
        logger.info('Data sent to Google Sheet Webhook successfully', { requestId });
      } catch (webhookError) {
        logger.error('Failed to send data to Google Sheet Webhook', {
          requestId,
          error: webhookError instanceof Error ? webhookError.message : 'Unknown error'
        });
        // Don't fail the main request if webhook fails
      }
    }

    logger.info('Analysis completed successfully', { requestId });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Analysis failed', { requestId, error: errorMessage });

    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: errorMessage,
        requestId
      },
      { status: 500 }
    );
  }
}

async function generateAISummary(
  content: { title: string; headings: string[]; text: string },
  scoreResult: CASHScoreResult,
  requestId: string
): Promise<{ shortBullets: string[]; oneLineHook: string }> {
  try {
    // Get signal details for context
    const allSignals = [
      ...scoreResult.signals.authority,
      ...scoreResult.signals.content,
      ...scoreResult.signals.systems,
      ...scoreResult.signals.hypergrowth,
    ];
    const weakSignals = allSignals.filter(s => s.score < 5).map(s => `${s.id} (${s.score}/10)`);

    // Extract loss amount from AI Receptionist offer
    const aiReceptionistOffer = scoreResult.offers.find(o => o.id === 'ai_receptionist');
    const lossAmount = aiReceptionistOffer?.monetizedLoss;
    const lossText = lossAmount ? `$${lossAmount.toLocaleString()}` : 'money';

    const prompt = `You are an agency advisor that sells AI receptionists and growth systems. Analyze this business website using the C.A.S.H. Method with 10 proprietary signals.

Title: ${content.title}
Content Preview: ${content.text.substring(0, 1500)}

C.A.S.H. Scores:
- Content: ${scoreResult.scores.content}/100 (Signals: Conversion Friction, Intent Strength, Value Proposition, Mobile Experience)
- Authority: ${scoreResult.scores.authority}/100 (Signals: Review Recency/Volume, Credential Verification, Social Proof Density, Trust Badges)
- Systems: ${scoreResult.scores.systems}/100 (Signal: Automation Infrastructure)
- Hypergrowth: ${scoreResult.scores.hypergrowth}/100 (Signal: Growth Attribution Tracking)
- Overall: ${scoreResult.scores.overall}/100

Weak Signals Detected: ${weakSignals.length > 0 ? weakSignals.join('; ') : 'None'}
Key Issues: ${scoreResult.priorityIssues.slice(0, 3).map(i => i.label).join('; ')}
Available Packages: ${scoreResult.offers.map(o => o.label).join('; ')}
${lossAmount ? `Monthly Loss Detected: $${lossAmount.toLocaleString()}/month from missed calls` : ''}

Return ONLY a JSON object with this exact structure:
{
  "shortBullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "oneLineHook": "one compelling hook for outreach"
}

Rules:
- Use "PAIN" language - focus on what's costing them money and customers RIGHT NOW
- For Review/Trust issues: Say "Your reviews are old. New customers see this and choose your competitor."
- For Automation issues: Say "You are manually following up with leads—you're too slow and leads are slipping away (Systemic Neglect)."
- For Credential issues: Say "We can't easily find proof you're licensed/certified. Customers can't trust you."
- shortBullets: 3-5 bullets, each 10-20 words max. Use direct, painful language about what's broken.
- oneLineHook: Format EXACTLY as "Hook: Stop losing money! Fix the major Trust Barriers and the ${lossText}/month call leak today." (Use the provided loss amount: ${lossText})
- No paragraphs, no long explanations
- Be direct, urgent, and focus on immediate pain
- Think like an agency selling Authenticity Overhaul and Scalability Architecture packages`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert agency advisor specializing in C.A.S.H. Method analysis. You sell AI receptionists and growth systems. Return only valid JSON, no other text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);

    // Fallback bullets with PAIN language
    const fallbackBullets = [
      scoreResult.scores.authority < 50 ? 'Your reviews are old. New customers see this and choose your competitor.' : `Authority score: ${scoreResult.scores.authority}/100 - trust signals weak`,
      scoreResult.scores.systems < 50 ? 'You are manually following up with leads—you\'re too slow and leads are slipping away (Systemic Neglect).' : `Systems score: ${scoreResult.scores.systems}/100 - automation gaps detected`,
      scoreResult.scores.content < 50 ? 'We can\'t easily find proof you\'re licensed/certified. Customers can\'t trust you.' : `Content score: ${scoreResult.scores.content}/100 - needs improvement`,
      `Overall CASH score: ${scoreResult.scores.overall}/100`,
    ].filter(b => b);

    const aiSummary = {
      shortBullets: Array.isArray(parsed.shortBullets) ? parsed.shortBullets : fallbackBullets,
      oneLineHook: parsed.oneLineHook || `Hook: Stop losing money! Fix the major Trust Barriers and the ${lossText}/month call leak today.`,
    };

    logger.info('AI summary generated', { requestId, bulletsCount: aiSummary.shortBullets.length });

    return aiSummary;
  } catch (error) {
    logger.error('AI summary generation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Fallback summary with PAIN language
    const aiReceptionistOffer = scoreResult.offers.find(o => o.id === 'ai_receptionist');
    const fallbackLossAmount = aiReceptionistOffer?.monetizedLoss;
    const fallbackLossText = fallbackLossAmount ? `$${fallbackLossAmount.toLocaleString()}` : 'money';

    return {
      shortBullets: [
        scoreResult.scores.authority < 50 ? 'Your reviews are old. New customers see this and choose your competitor.' : `Authority: ${scoreResult.scores.authority}/100 - trust signals weak`,
        scoreResult.scores.systems < 50 ? 'You are manually following up with leads—you\'re too slow and leads are slipping away (Systemic Neglect).' : `Systems: ${scoreResult.scores.systems}/100 - automation gaps detected`,
        scoreResult.scores.content < 50 ? 'We can\'t easily find proof you\'re licensed/certified. Customers can\'t trust you.' : `Content: ${scoreResult.scores.content}/100 - needs improvement`,
        `Overall CASH score: ${scoreResult.scores.overall}/100`,
      ],
      oneLineHook: `Hook: Stop losing money! Fix the major Trust Barriers and the ${fallbackLossText}/month call leak today.`,
    };
  }
}

