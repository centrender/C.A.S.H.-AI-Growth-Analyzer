import { ScrapedContent, CASHScore, Signal, PriorityIssue, Offer, GMBProfile } from '@/types';
import * as cheerio from 'cheerio';

// Business type to monthly loss multiplier mapping
// Represents per-lead value for different business types
const BUSINESS_PROFIT_MULTIPLIERS: Record<string, number> = {
  dentist: 200,      // $200 per lead
  dental: 200,
  'auto repair': 150,
  'auto shop': 150,
  mechanic: 150,
  clinic: 180,
  medical: 180,
  'law firm': 300,
  lawyer: 300,
  attorney: 300,
  'real estate': 250,
  realtor: 250,
  'property management': 2000, // Corporate scale
  'corporate housing': 2000,   // Corporate scale
  'home services': 120,
  plumber: 120,
  electrician: 120,
  hvac: 120,
  // Low ticket / High volume
  restaurant: 112,
  cafe: 112,
  retail: 112,
  food: 112,
};

// Default per-lead value for unidentified/general clients
// Changed from 2000 ($180k/mo) to 112 (~$10k/mo) to prevent pollution of non-corporate reports
const DEFAULT_PER_LEAD_VALUE = 112;

// Fixed number of missed calls per month
const MISSED_CALLS_PER_MONTH = 90;

export interface CASHScoreResult {
  scores: CASHScore;
  signals: {
    content: Signal[];
    authority: Signal[];
    systems: Signal[];
    hypergrowth: Signal[];
  };
  priorityIssues: PriorityIssue[];
  offers: Offer[];
  detectedBusinessType?: string; // For VAPI CTA
}

export function calculateCASHScoreV2(content: ScrapedContent, gmbProfile?: GMBProfile): CASHScoreResult {
  const html = content.html || '';
  const text = content.text.toLowerCase();
  const title = content.title.toLowerCase();
  const $ = html ? cheerio.load(html) : null;

  // Detect business type early for use in offers and CTA
  const detectedBusinessType = detectBusinessType(content.text, content.title);

  // Calculate 10 proprietary signals
  // Authority/Trust Signals (1, 2, 3, 9) + GMB
  const authoritySignals = calculateAuthoritySignals(text, title, html, $, gmbProfile);

  // Content/Friction/Intent Signals (4, 5, 7, 8)
  const contentSignals = calculateContentSignals(text, title, html, $);

  // Systems Signal (6)
  const systemsSignals = calculateSystemsSignals(text, html, $);

  // Hypergrowth Signal (10)
  const hypergrowthSignals = calculateHypergrowthSignals(text, html, $);

  // Calculate category scores (0-100) from signals (0-10 each)
  const contentScore = normalizeCategoryScore(contentSignals);

  // Authority Score Calculation (50% On-Page, 50% GMB)
  // Filter out the GMB signal to calculate on-page score first
  const onPageAuthoritySignals = authoritySignals.filter(s => s.id !== 'signal_gmb_profile');
  const onPageAuthorityScore = normalizeCategoryScore(onPageAuthoritySignals);
  const gmbScore = gmbProfile?.score || 0;

  // Apply 50/50 weighting
  const authorityScore = Math.round((onPageAuthorityScore * 0.5) + (gmbScore * 0.5));
  const systemsScore = normalizeCategoryScore(systemsSignals);
  const hypergrowthScore = normalizeCategoryScore(hypergrowthSignals);

  // Overall score (weighted average, each 0.25)
  const overall = Math.round(
    (contentScore * 0.25) +
    (authorityScore * 0.25) +
    (systemsScore * 0.25) +
    (hypergrowthScore * 0.25)
  );

  const scores: CASHScore = {
    overall,
    content: contentScore,
    authority: authorityScore,
    systems: systemsScore,
    hypergrowth: hypergrowthScore,
  };

  // Generate priority issues and offers
  const priorityIssues = generatePriorityIssues(scores, {
    content: contentSignals,
    authority: authoritySignals,
    systems: systemsSignals,
    hypergrowth: hypergrowthSignals,
  });

  const offers = generateOffers(scores, {
    content: contentSignals,
    authority: authoritySignals,
    systems: systemsSignals,
    hypergrowth: hypergrowthSignals,
  }, content, detectedBusinessType, gmbProfile);

  return {
    scores,
    signals: {
      content: contentSignals,
      authority: authoritySignals,
      systems: systemsSignals,
      hypergrowth: hypergrowthSignals,
    },
    priorityIssues,
    offers,
    detectedBusinessType: detectedBusinessType || undefined,
  };
}

// ============================================================================
// 10 PROPRIETARY SIGNALS - V4
// ============================================================================

// AUTHORITY/TRUST SIGNALS (1, 2, 3, 9)
function calculateAuthoritySignals(text: string, title: string, html: string, $: cheerio.CheerioAPI | null, gmbProfile?: GMBProfile): Signal[] {
  const signals: Signal[] = [];

  // Signal 1: Review Recency & Volume
  const reviewWidgets = html.match(/(google-reviews|yelp-review|review-widget|reviews-widget)/gi) || [];
  const reviewMentions = (text.match(/\b(review|rating|stars|testimonial|google reviews|yelp)\b/gi) || []).length;
  const recentReviewKeywords = ['recent', 'latest', 'new review', 'just reviewed', 'this month'];
  const hasRecentMentions = recentReviewKeywords.some(kw => text.includes(kw));

  let reviewScore = 0;
  if (reviewWidgets.length > 0) reviewScore += 5;
  if (reviewMentions >= 3) reviewScore += 3;
  if (hasRecentMentions) reviewScore += 2;
  else if (reviewMentions > 0) reviewScore += 1;

  signals.push({
    id: 'signal_1_review_recency_volume',
    label: 'Review Recency & Volume',
    score: Math.min(10, reviewScore),
    notes: reviewScore >= 7 ? 'Strong review presence with recent activity' : 'Your reviews are old or missing. New customers see this and don\'t trust you.',
  });

  // Signal 2: Credential Verification & Display
  const credentialPatterns = [
    /\b(licensed|certified|board certified|accredited)\b/gi,
    /\b(dr\.|doctor|md|dds|dmd|phd)\b/gi,
    /\b(degree|education|university|college|school)\b/gi,
    /\b(years of experience|experience since|since \d{4})\b/gi,
  ];
  const credentialMatches = credentialPatterns.reduce((sum, pattern) => sum + (text.match(pattern) || []).length, 0);
  const hasCredentialSection = /(about|team|staff|credentials|qualifications|our doctor|our team)/i.test(text);

  let credentialScore = 0;
  if (credentialMatches >= 5) credentialScore = 9;
  else if (credentialMatches >= 3) credentialScore = 7;
  else if (credentialMatches >= 1 && hasCredentialSection) credentialScore = 5;
  else if (credentialMatches >= 1) credentialScore = 3;
  else credentialScore = 1;

  signals.push({
    id: 'signal_2_credential_verification',
    label: 'Credential Verification & Display',
    score: credentialScore,
    notes: credentialScore >= 7 ? 'Strong credential display and verification' : 'Credentials not prominently displayed or verified',
  });

  // Signal 3: Social Proof Density
  const socialLinks = html.match(/(facebook\.com|instagram\.com|twitter\.com|linkedin\.com|youtube\.com|tiktok\.com)/gi) || [];
  const testimonialCount = (text.match(/\b(testimonial|client said|customer said|review from)\b/gi) || []).length;
  const caseStudyMentions = (text.match(/\b(case study|success story|client story|results)\b/gi) || []).length;

  let socialProofScore = 0;
  if (socialLinks.length >= 3) socialProofScore += 4;
  else if (socialLinks.length >= 1) socialProofScore += 2;
  if (testimonialCount >= 3) socialProofScore += 4;
  else if (testimonialCount >= 1) socialProofScore += 2;
  if (caseStudyMentions >= 1) socialProofScore += 2;

  signals.push({
    id: 'signal_3_social_proof_density',
    label: 'Social Proof Density',
    score: Math.min(10, socialProofScore),
    notes: socialProofScore >= 7 ? 'High social proof density across multiple channels' : 'Limited social proof elements detected',
  });



  // Signal 9: Trust Badge Presence
  const trustBadges = html.match(/(bbb|better business bureau|verified|trusted|award|certification|guarantee|warranty)/gi) || [];
  const securityIndicators = html.match(/(ssl|https|secure|encrypted|privacy policy|terms of service)/gi) || [];
  const guaranteeMentions = (text.match(/\b(guarantee|money back|satisfaction guaranteed|warranty)\b/gi) || []).length;

  let trustBadgeScore = 0;
  if (trustBadges.length >= 2) trustBadgeScore += 4;
  else if (trustBadges.length >= 1) trustBadgeScore += 2;
  if (securityIndicators.length >= 2) trustBadgeScore += 3;
  else if (securityIndicators.length >= 1) trustBadgeScore += 1;
  if (guaranteeMentions >= 1) trustBadgeScore += 3;

  signals.push({
    id: 'signal_9_trust_badge_presence',
    label: 'Trust Badge Presence',
    score: Math.min(10, trustBadgeScore),
    notes: trustBadgeScore >= 7 ? 'Strong trust badges and security indicators' : 'Missing trust badges and security signals',
  });

  // Signal: Google Business Profile (GMB)
  // This signal is visual only here; the score is weighted 50% in the main calculation
  const gmbScore = gmbProfile?.score ? Math.round(gmbProfile.score / 10) : 0; // Convert 0-100 to 0-10 for signal display

  let gmbNotes = 'GMB Profile not found. Critical Authority Signal Missing.';
  if (gmbProfile?.found) {
    if (gmbScore >= 9) gmbNotes = 'Excellent Google Business Profile detected.';
    else if (gmbScore >= 7) gmbNotes = 'Good GMB Profile, but room for optimization.';
    else gmbNotes = 'Weak GMB Profile. Low ratings or activity detected.';
  }

  signals.push({
    id: 'signal_gmb_profile',
    label: 'Google Business Profile Health',
    score: gmbScore,
    notes: gmbNotes,
  });

  return signals;
}

// CONTENT/FRICTION/INTENT SIGNALS (4, 5, 7, 8)
function calculateContentSignals(text: string, title: string, html: string, $: cheerio.CheerioAPI | null): Signal[] {
  const signals: Signal[] = [];

  // Signal 4: Conversion Friction Points
  const frictionIndicators = {
    longForms: (html.match(/(input|textarea|form).*required/gi) || []).length >= 5,
    multipleSteps: /(step|page \d|continue|next)/i.test(text),
    unclearPricing: !/(price|cost|fee|starting at|\$|pricing)/i.test(text),
    noClearCTA: !/(book now|call now|get started|schedule|contact|free consultation)/i.test(text),
  };

  let frictionScore = 10;
  if (frictionIndicators.longForms) frictionScore -= 2;
  if (frictionIndicators.multipleSteps) frictionScore -= 2;
  if (frictionIndicators.unclearPricing) frictionScore -= 3;
  if (frictionIndicators.noClearCTA) frictionScore -= 3;
  frictionScore = Math.max(1, frictionScore);

  signals.push({
    id: 'signal_4_conversion_friction',
    label: 'Conversion Friction Points',
    score: frictionScore,
    notes: frictionScore >= 7 ? 'Low friction conversion path detected' : 'High friction points blocking conversions',
  });

  // Signal 5: Intent Signal Strength
  const intentKeywords = {
    urgency: ['limited time', 'act now', 'today only', 'expires', 'hurry', 'don\'t wait'],
    value: ['free', 'save', 'discount', 'special offer', 'deal', 'package'],
    social: ['join', 'become a member', 'sign up', 'register', 'subscribe'],
    action: ['book', 'schedule', 'call', 'contact', 'get started', 'learn more'],
  };

  const intentScore = Object.values(intentKeywords).reduce((sum, keywords) => {
    return sum + (keywords.some(kw => text.includes(kw) || title.includes(kw)) ? 2.5 : 0);
  }, 0);

  signals.push({
    id: 'signal_5_intent_signal_strength',
    label: 'Intent Signal Strength',
    score: Math.min(10, Math.round(intentScore)),
    notes: intentScore >= 7 ? 'Strong intent signals throughout content' : 'Weak intent signals - unclear value proposition',
  });

  // Signal 7: Value Proposition Clarity
  const valueProps = {
    unique: ['unique', 'exclusive', 'only', 'first', 'pioneer', 'innovative'],
    benefit: ['results', 'outcome', 'transform', 'improve', 'solve', 'help'],
    specific: /\b(\d+%|\$\d+|\d+ years|\d+ clients)\b/.test(text),
    comparison: ['vs', 'compared to', 'better than', 'unlike', 'difference'],
  };

  let valuePropScore = 0;
  if (valueProps.unique.some(kw => text.includes(kw))) valuePropScore += 2;
  if (valueProps.benefit.some(kw => text.includes(kw))) valuePropScore += 3;
  if (valueProps.specific) valuePropScore += 3;
  if (valueProps.comparison.some(kw => text.includes(kw))) valuePropScore += 2;

  signals.push({
    id: 'signal_7_value_proposition_clarity',
    label: 'Value Proposition Clarity',
    score: Math.min(10, valuePropScore),
    notes: valuePropScore >= 7 ? 'Clear, specific value proposition' : 'Vague or generic value proposition',
  });

  // Signal 8: Mobile Experience Quality
  const mobileIndicators = {
    responsive: /(viewport|responsive|mobile|@media)/i.test(html),
    touchFriendly: /(button|click|tap|touch)/i.test(text) && !/(desktop only|not available on mobile)/i.test(text),
    fastLoad: !/(slow|loading|wait|buffering)/i.test(text),
    readable: text.length > 200 && text.length < 5000, // Reasonable content length
  };

  let mobileScore = 0;
  if (mobileIndicators.responsive) mobileScore += 4;
  if (mobileIndicators.touchFriendly) mobileScore += 2;
  if (mobileIndicators.fastLoad) mobileScore += 2;
  if (mobileIndicators.readable) mobileScore += 2;

  signals.push({
    id: 'signal_8_mobile_experience',
    label: 'Mobile Experience Quality',
    score: Math.min(10, mobileScore),
    notes: mobileScore >= 7 ? 'Optimized mobile experience detected' : 'Mobile experience needs improvement',
  });

  return signals;
}

// SYSTEMS SIGNAL (6)
function calculateSystemsSignals(text: string, html: string, $: cheerio.CheerioAPI | null): Signal[] {
  const signals: Signal[] = [];

  // Signal 6: Automation Infrastructure
  const automationIndicators = {
    bookingSystem: /(calendly|acuity|appointment|booking|schedule online|book now)/i.test(html) ||
      /(book online|schedule online|appointment booking)/i.test(text),
    aiChatbot: /(chatbot|ai assistant|virtual assistant|automated|24\/7|always available)/i.test(text) ||
      html.includes('chatbot') || html.includes('intercom') || html.includes('drift'),
    crmIntegration: /(crm|customer relationship|patient portal|portal|login|dashboard|client portal)/i.test(text),
    emailAutomation: /(newsletter|email list|subscribe|mailchimp|constant contact|automated email)/i.test(text),
    paymentSystem: /(pay|payment|checkout|stripe|paypal|square|invoice)/i.test(text),
  };

  let automationScore = 0;
  if (automationIndicators.bookingSystem) automationScore += 3;
  if (automationIndicators.aiChatbot) automationScore += 3;
  if (automationIndicators.crmIntegration) automationScore += 2;
  if (automationIndicators.emailAutomation) automationScore += 1;
  if (automationIndicators.paymentSystem) automationScore += 1;

  signals.push({
    id: 'signal_6_automation_infrastructure',
    label: 'Automation Infrastructure',
    score: Math.min(10, automationScore),
    notes: automationScore >= 7 ? 'Strong automation infrastructure in place' : 'No instant client connection is possible (only a slow contact form). This is a huge leak in your acquisition system.',
  });

  return signals;
}

// HYPERGROWTH SIGNAL (10)
function calculateHypergrowthSignals(text: string, html: string, $: cheerio.CheerioAPI | null): Signal[] {
  const signals: Signal[] = [];

  // Signal 10: Growth Attribution Tracking
  const trackingIndicators = {
    analytics: /(google-analytics|gtag|ga\(|analytics\.js|gtm)/i.test(html),
    pixel: /(facebook-pixel|fbq|pixel|tracking pixel)/i.test(html),
    conversion: /(conversion|goal|event tracking|track|measure)/i.test(text),
    heatmap: /(hotjar|crazy egg|mouseflow|heatmap|session recording)/i.test(html),
    attribution: /(utm|source|campaign|medium|attribution)/i.test(html) || /(utm|source|campaign)/i.test(text),
  };

  let trackingScore = 0;
  if (trackingIndicators.analytics) trackingScore += 3;
  if (trackingIndicators.pixel) trackingScore += 2;
  if (trackingIndicators.conversion) trackingScore += 2;
  if (trackingIndicators.heatmap) trackingScore += 2;
  if (trackingIndicators.attribution) trackingScore += 1;

  signals.push({
    id: 'signal_10_growth_attribution',
    label: 'Growth Attribution Tracking',
    score: Math.min(10, trackingScore),
    notes: trackingScore >= 7 ? 'Comprehensive growth attribution tracking' : 'Missing or incomplete growth tracking',
  });

  return signals;
}

// Normalize category score from signals (0-10 each) to 0-100
function normalizeCategoryScore(signals: Signal[]): number {
  if (signals.length === 0) return 0;
  const total = signals.reduce((sum, signal) => sum + signal.score, 0);
  const maxPossible = signals.length * 10;
  return Math.round((total / maxPossible) * 100);
}

// Generate priority issues based on low scores
function generatePriorityIssues(
  scores: CASHScore,
  signals: { content: Signal[]; authority: Signal[]; systems: Signal[]; hypergrowth: Signal[] }
): PriorityIssue[] {
  const issues: PriorityIssue[] = [];

  // Check each category
  if (scores.content < 50) {
    const lowContentSignal = signals.content.find(s => s.score < 5);
    if (lowContentSignal) {
      issues.push({
        id: `content_${lowContentSignal.id}`,
        label: lowContentSignal.notes,
        severity: scores.content < 30 ? 'high' : 'medium',
      });
    }
  }

  if (scores.authority < 50) {
    const lowAuthoritySignal = signals.authority.find(s => s.score < 5);
    if (lowAuthoritySignal) {
      issues.push({
        id: `authority_${lowAuthoritySignal.id}`,
        label: lowAuthoritySignal.notes,
        severity: scores.authority < 30 ? 'high' : 'medium',
      });
    }
  }

  if (scores.systems < 50) {
    const lowSystemsSignal = signals.systems.find(s => s.score < 5);
    if (lowSystemsSignal) {
      issues.push({
        id: `systems_${lowSystemsSignal.id}`,
        label: lowSystemsSignal.notes,
        severity: scores.systems < 30 ? 'high' : 'medium',
      });
    }
  }

  if (scores.hypergrowth < 50) {
    const lowHypergrowthSignal = signals.hypergrowth.find(s => s.score < 5);
    if (lowHypergrowthSignal) {
      issues.push({
        id: `hypergrowth_${lowHypergrowthSignal.id}`,
        label: lowHypergrowthSignal.notes,
        severity: scores.hypergrowth < 30 ? 'high' : 'medium',
      });
    }
  }

  return issues.slice(0, 5); // Max 5 issues
}

// Detect business type from content
function detectBusinessType(text: string, title: string): string | null {
  const combined = `${text} ${title}`.toLowerCase();

  // Priority check for Property Management / Corporate Housing
  if (combined.includes('property management') || combined.includes('corporate housing') || combined.includes('multifamily')) {
    return 'Property Management';
  }

  // Check for specific business types
  const typeMapping: Record<string, string[]> = {
    'Dentist': ['dentist', 'dental', 'orthodontist', 'oral surgeon'],
    'Auto Repair': ['auto repair', 'auto shop', 'mechanic', 'automotive'],
    'Clinic': ['clinic', 'medical', 'healthcare', 'physician'],
    'Law Firm': ['law firm', 'lawyer', 'attorney', 'legal'],
    'Real Estate': ['real estate', 'realtor', 'realty', 'property'],
    'Plumber': ['plumber', 'plumbing', 'pipe'],
    'Electrician': ['electrician', 'electrical'],
    'HVAC': ['hvac', 'heating', 'cooling', 'air conditioning'],
    'Restaurant': ['restaurant', 'dining', 'bistro', 'eatery'],
    'Cafe': ['cafe', 'coffee', 'espresso', 'bakery'],
    'Retail': ['retail', 'shop', 'store', 'boutique'],
    'Food': ['food', 'menu', 'lunch', 'dinner'],
  };

  for (const [type, keywords] of Object.entries(typeMapping)) {
    if (keywords.some(kw => combined.includes(kw))) {
      return type;
    }
  }

  return null;
}

// Calculate monetized loss for missed calls
function calculateMonetizedLoss(text: string, title: string, systemsScore: number, automationScore: number): number | undefined {
  // Only calculate if Systems score < 50 OR automation signal is low (< 5)
  if (systemsScore >= 50 && automationScore >= 5) {
    return undefined;
  }

  // Detect business type
  const businessType = detectBusinessType(text, title);
  const perLeadValue = businessType
    ? BUSINESS_PROFIT_MULTIPLIERS[businessType.toLowerCase()] || DEFAULT_PER_LEAD_VALUE
    : DEFAULT_PER_LEAD_VALUE;

  // Calculate monthly loss: missed calls * per-lead value
  const monthlyLoss = MISSED_CALLS_PER_MONTH * perLeadValue;

  return monthlyLoss;
}

// Generate offers based on low scores - V4 Premium Packages
function generateOffers(
  scores: CASHScore,
  signals: { content: Signal[]; authority: Signal[]; systems: Signal[]; hypergrowth: Signal[] },
  content: ScrapedContent,
  detectedBusinessType: string | null,
  gmbProfile?: GMBProfile
): Offer[] {
  const offers: Offer[] = [];

  // Check Authority/Trust Signals (1, 2, 3, 9) for Authenticity Overhaul
  const trustSignals = [
    signals.authority.find(s => s.id === 'signal_1_review_recency_volume'),
    signals.authority.find(s => s.id === 'signal_2_credential_verification'),
    signals.authority.find(s => s.id === 'signal_3_social_proof_density'),
    signals.authority.find(s => s.id === 'signal_9_trust_badge_presence'),
  ].filter(Boolean) as Signal[];

  const lowTrustSignals = trustSignals.filter(s => s.score < 5);
  if (scores.authority < 70 && lowTrustSignals.length >= 2) {
    offers.push({
      id: 'authenticity_overhaul',
      label: 'Authenticity Overhaul Package',
      reason: 'ATTENTION: Significant Trust Barriers. We found major Authenticity Gaps that cause customers to choose a competitor. Solution: Comprehensive rebuild of reviews, credentials, and trust signals.',
      priority: scores.authority < 40 ? 'high' : 'medium',
    });
  }

  // Review Management System for low review scores
  const reviewSignal = signals.authority.find(s => s.id === 'signal_1_review_recency_volume');
  if (scores.authority < 70 && reviewSignal && reviewSignal.score < 5) {
    offers.push({
      id: 'review_management',
      label: 'Review Management System',
      reason: 'FIX: We provide a 5-Star Review Machine to instantly fix your trust problem and outrank competitors.',
      priority: scores.authority < 40 ? 'high' : 'medium',
    });
  }

  // GMB Specific Offers
  if (gmbProfile) {
    // Offer: Reputation Resurrection
    // Condition: Rating < 4.5 OR Review Count < 40 OR Recency > 3 months (approx check via score)
    // We use the raw profile data for precision
    const isLowRating = (gmbProfile.rating || 0) < 4.5;
    const isLowVolume = (gmbProfile.reviewCount || 0) < 40;
    // We don't have exact recency in days here easily without parsing, but we can infer from score or just use these two.
    // User requirement: "Star Rating < 4.5 OR Review Count < 40 OR Recency > 3 months"

    // Check recency if available
    let isOldReviews = false;
    if (gmbProfile.lastReviewDate) {
      const daysSince = (Date.now() - new Date(gmbProfile.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 90) isOldReviews = true;
    }

    if (gmbProfile.found && (isLowRating || isLowVolume || isOldReviews)) {
      offers.push({
        id: 'reputation_resurrection',
        label: 'Reputation Resurrection',
        reason: 'CRITICAL: Your Google Reputation is hurting you. < 4.5 Stars or low reviews means customers ignore you. We install an automated system to get 5-star reviews on autopilot.',
        priority: 'high',
      });
    }

    // Offer: Local Dominance Pack
    // Condition: Not found OR very low score
    if (!gmbProfile.found || gmbProfile.score < 50) {
      offers.push({
        id: 'local_dominance',
        label: 'Local Dominance Pack',
        reason: !gmbProfile.found
          ? 'INVISIBLE: We cannot find your Google Business Profile. You are invisible to local customers. We will claim, verify, and rank your profile #1.'
          : 'WEAK PRESENCE: Your Google Profile is unoptimized and losing traffic. We optimize photos, posts, and categories to dominate the Map Pack.',
        priority: 'high',
      });
    }
  } else {
    // Fallback if GMB profile was not passed (e.g. legacy or error), treat as not found
    offers.push({
      id: 'local_dominance',
      label: 'Local Dominance Pack',
      reason: 'INVISIBLE: We cannot find your Google Business Profile. You are invisible to local customers. We will claim, verify, and rank your profile #1.',
      priority: 'high',
    });
  }

  // Check Systems/Hypergrowth Signals (6, 10) for Scalability Architecture
  const automationSignal = signals.systems.find(s => s.id === 'signal_6_automation_infrastructure');
  const trackingSignal = signals.hypergrowth.find(s => s.id === 'signal_10_growth_attribution');

  if (scores.systems < 70 || scores.hypergrowth < 70) {
    const hasLowAutomation = automationSignal && automationSignal.score < 5;
    const hasLowTracking = trackingSignal && trackingSignal.score < 5;

    if (hasLowAutomation || hasLowTracking) {
      // Calculate monetized loss for AI Receptionist offer
      const monetizedLoss = calculateMonetizedLoss(
        content.text,
        content.title,
        scores.systems,
        automationSignal?.score || 0
      );

      if (hasLowAutomation) {
        offers.push({
          id: 'ai_receptionist',
          label: '24/7 AI Receptionist',
          reason: monetizedLoss
            ? `URGENT: Your Phone Is Losing You $${monetizedLoss.toLocaleString()}/month. No online booking system detected. Our AI receptionist handles calls and bookings 24/7.`
            : 'URGENT: Your Phone Is Losing You Money. No online booking system detected. Our AI receptionist handles calls and bookings 24/7.',
          priority: scores.systems < 40 ? 'high' : 'medium',
          monetizedLoss,
        });
      }

      // Scalability Architecture Package
      if ((hasLowAutomation && hasLowTracking) || scores.systems < 50 || scores.hypergrowth < 50) {
        offers.push({
          id: 'scalability_architecture',
          label: 'Scalability Architecture Package',
          reason: 'STOP THE LEAKS: You Cannot Handle Growth. Your current system is manual, slow, and drops qualified leads. Solution: Complete automation setup, instant follow-up, and growth tracking.',
          priority: (scores.systems < 40 || scores.hypergrowth < 40) ? 'high' : 'medium',
        });
      }
    }
  }

  return offers.slice(0, 4); // Max 4 offers
}
