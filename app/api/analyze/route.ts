import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { scrapeUrl } from '@/utils/scraper';
import { calculateCASHScore } from '@/utils/cash-scoring';
import { logger } from '@/utils/logger';
import { AnalysisResult } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const requestId = logger.info('Analysis request received');

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      logger.warn('Invalid URL provided', { requestId, url });
      return NextResponse.json(
        { error: 'Valid URL is required', requestId },
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

    // Calculate CASH scores
    logger.info('Calculating CASH scores', { requestId });
    const cashScore = calculateCASHScore(scrapedContent);
    logger.info('CASH scores calculated', { requestId, cashScore });

    // Generate AI analysis
    logger.info('Generating AI analysis', { requestId });
    const aiAnalysis = await generateAIAnalysis(scrapedContent, cashScore, requestId);

    // Prepare result
    const result: AnalysisResult = {
      requestId,
      url,
      scrapedContent,
      cashScore,
      aiAnalysis,
      timestamp: new Date().toISOString(),
    };

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

async function generateAIAnalysis(
  content: { title: string; headings: string[]; text: string },
  cashScore: { clarity: number; authority: number; structure: number; headlines: number; overall: number },
  requestId: string
): Promise<string> {
  try {
    const prompt = `You are a content analysis expert. Analyze the following content using the C.A.S.H. Method:

Title: ${content.title}

Headings: ${content.headings.slice(0, 10).join(', ')}

Content Preview: ${content.text.substring(0, 2000)}

C.A.S.H. Scores:
- Clarity: ${cashScore.clarity}/100
- Authority: ${cashScore.authority}/100
- Structure: ${cashScore.structure}/100
- Headlines: ${cashScore.headlines}/100
- Overall: ${cashScore.overall}/100

Provide a comprehensive analysis (2-3 paragraphs) that:
1. Explains what the scores mean in the context of this content
2. Identifies strengths and areas for improvement
3. Provides actionable recommendations for each C.A.S.H. dimension
4. Focuses on practical, implementable advice

Write in a professional, helpful tone.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert content analyst specializing in the C.A.S.H. Method (Clarity, Authority, Structure, Headlines). Provide detailed, actionable feedback.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || 'Analysis could not be generated.';
    logger.info('AI analysis generated', { requestId, analysisLength: analysis.length });
    
    return analysis;
  } catch (error) {
    logger.error('AI analysis generation failed', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Fallback analysis if AI fails
    return `Based on the C.A.S.H. scores, this content has an overall rating of ${cashScore.overall}/100. 

The content shows ${cashScore.clarity >= 60 ? 'good' : 'needs improvement in'} clarity, ${cashScore.authority >= 60 ? 'strong' : 'moderate'} authority, ${cashScore.structure >= 60 ? 'well-structured' : 'structural'} organization, and ${cashScore.headlines >= 60 ? 'effective' : 'could improve'} headlines.

To improve the overall score, focus on enhancing the lower-scoring dimensions. Consider adding more depth to establish authority, improving content structure with clear sections, and optimizing headlines for better engagement.`;
  }
}

