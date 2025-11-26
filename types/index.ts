export interface ScrapedContent {
  title: string;
  headings: string[];
  text: string;
  url: string;
  html?: string; // Raw HTML for signal detection
}

export interface CASHScore {
  overall: number;
  content: number;
  authority: number;
  systems: number;
  hypergrowth: number;
}

export interface Signal {
  id: string;
  label: string;
  score: number; // 0-10
  notes: string;
}

export interface PriorityIssue {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Offer {
  id: string;
  label: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  monetizedLoss?: number; // Monthly loss in dollars (for AI Receptionist offer)
}

export interface AISummary {
  shortBullets: string[];
  oneLineHook: string;
}

export interface AnalysisResult {
  requestId: string;
  url: string;
  timestamp: string;
  clientEmail?: string; // Verified email from email gate
  detectedBusinessType?: string; // For VAPI CTA
  scores: CASHScore;
  signals: {
    content: Signal[];
    authority: Signal[];
    systems: Signal[];
    hypergrowth: Signal[];
  };
  priorityIssues: PriorityIssue[];
  offers: Offer[];
  aiSummary: AISummary;
  // Keep for backward compatibility (optional)
  scrapedContent?: ScrapedContent;
  cashScore?: CASHScore; // Legacy format
  aiAnalysis?: string; // Legacy format
}

export interface AnalysisRequest {
  url: string;
  email?: string; // Verified email from email gate
}

