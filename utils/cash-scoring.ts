import { ScrapedContent, CASHScore } from '@/types';

export function calculateCASHScore(content: ScrapedContent): CASHScore {
  // Clarity Score (0-100)
  const clarity = calculateClarity(content);

  // Authority Score (0-100)
  const authority = calculateAuthority(content);

  // Structure Score (0-100)
  const structure = calculateStructure(content);

  // Headlines Score (0-100)
  const headlines = calculateHeadlines(content);

  // Overall Score (weighted average)
  const overall = Math.round(
    (clarity * 0.3) + 
    (authority * 0.25) + 
    (structure * 0.25) + 
    (headlines * 0.2)
  );

  return {
    clarity,
    authority,
    structure,
    headlines,
    overall,
  };
}

function calculateClarity(content: ScrapedContent): number {
  let score = 50; // Base score

  // Check text length (optimal: 500-2000 words)
  const wordCount = content.text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount >= 500 && wordCount <= 2000) {
    score += 20;
  } else if (wordCount >= 300 && wordCount <= 3000) {
    score += 10;
  } else if (wordCount < 100) {
    score -= 30;
  }

  // Check for readability indicators
  const avgSentenceLength = content.text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  if (avgSentenceLength > 0) {
    const wordsPerSentence = wordCount / avgSentenceLength;
    if (wordsPerSentence >= 10 && wordsPerSentence <= 20) {
      score += 15;
    } else if (wordsPerSentence > 25) {
      score -= 15;
    }
  }

  // Title clarity
  if (content.title && content.title.length >= 30 && content.title.length <= 60) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateAuthority(content: ScrapedContent): number {
  let score = 40; // Base score

  // Check for authoritative keywords
  const authorityKeywords = [
    'research', 'study', 'data', 'analysis', 'expert', 'professional',
    'certified', 'authority', 'evidence', 'proven', 'verified', 'credible'
  ];

  const textLower = content.text.toLowerCase();
  const titleLower = content.title.toLowerCase();
  
  let keywordCount = 0;
  authorityKeywords.forEach(keyword => {
    if (textLower.includes(keyword) || titleLower.includes(keyword)) {
      keywordCount++;
    }
  });

  score += Math.min(30, keywordCount * 5);

  // Content length indicates depth/authority
  const wordCount = content.text.split(/\s+/).filter(w => w.length > 0).length;
  if (wordCount >= 1000) {
    score += 20;
  } else if (wordCount >= 500) {
    score += 10;
  }

  // Title quality
  if (content.title && content.title.length > 20) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateStructure(content: ScrapedContent): number {
  let score = 50; // Base score

  // Heading hierarchy check
  const headingCount = content.headings.length;
  if (headingCount >= 3 && headingCount <= 10) {
    score += 25;
  } else if (headingCount > 10) {
    score += 15;
  } else if (headingCount < 2) {
    score -= 20;
  }

  // Check for proper heading structure (h1 should exist)
  const hasH1 = content.headings.some((_, idx) => {
    // We can't determine tag type from extracted text, so we assume first heading is h1
    return idx === 0;
  });
  if (hasH1) {
    score += 15;
  }

  // Content organization (paragraphs, sections)
  const paragraphCount = content.text.split(/\n\n/).filter(p => p.trim().length > 0).length;
  if (paragraphCount >= 3) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateHeadlines(content: ScrapedContent): number {
  let score = 50; // Base score

  // Title quality
  if (content.title) {
    const titleLength = content.title.length;
    if (titleLength >= 30 && titleLength <= 60) {
      score += 20; // Optimal length
    } else if (titleLength >= 20 && titleLength <= 70) {
      score += 10;
    } else if (titleLength < 10) {
      score -= 20;
    }

    // Check for power words
    const powerWords = ['ultimate', 'complete', 'guide', 'best', 'top', 'essential', 'proven', 'effective'];
    const titleLower = content.title.toLowerCase();
    if (powerWords.some(word => titleLower.includes(word))) {
      score += 10;
    }
  }

  // Heading quality
  if (content.headings.length > 0) {
    const avgHeadingLength = content.headings.reduce((sum, h) => sum + h.length, 0) / content.headings.length;
    if (avgHeadingLength >= 20 && avgHeadingLength <= 60) {
      score += 15;
    }

    // Check for question-based headings (engagement)
    const questionHeadings = content.headings.filter(h => h.includes('?')).length;
    if (questionHeadings > 0 && questionHeadings <= 3) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

