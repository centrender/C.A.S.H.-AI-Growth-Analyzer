export interface ScrapedContent {
  title: string;
  headings: string[];
  text: string;
  url: string;
}

export interface CASHScore {
  clarity: number;
  authority: number;
  structure: number;
  headlines: number;
  overall: number;
}

export interface AnalysisResult {
  requestId: string;
  url: string;
  scrapedContent: ScrapedContent;
  cashScore: CASHScore;
  aiAnalysis: string;
  timestamp: string;
}

export interface AnalysisRequest {
  url: string;
}

