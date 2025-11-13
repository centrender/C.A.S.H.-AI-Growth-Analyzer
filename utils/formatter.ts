import { CASHScore, AnalysisResult } from '@/types';

export function formatScore(score: number): string {
  return `${score}/100`;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-yellow-100';
  if (score >= 40) return 'bg-orange-100';
  return 'bg-red-100';
}

export function formatCASHScore(cashScore: CASHScore): {
  clarity: { value: string; color: string; bgColor: string };
  authority: { value: string; color: string; bgColor: string };
  structure: { value: string; color: string; bgColor: string };
  headlines: { value: string; color: string; bgColor: string };
  overall: { value: string; color: string; bgColor: string };
} {
  return {
    clarity: {
      value: formatScore(cashScore.clarity),
      color: getScoreColor(cashScore.clarity),
      bgColor: getScoreBgColor(cashScore.clarity),
    },
    authority: {
      value: formatScore(cashScore.authority),
      color: getScoreColor(cashScore.authority),
      bgColor: getScoreBgColor(cashScore.authority),
    },
    structure: {
      value: formatScore(cashScore.structure),
      color: getScoreColor(cashScore.structure),
      bgColor: getScoreBgColor(cashScore.structure),
    },
    headlines: {
      value: formatScore(cashScore.headlines),
      color: getScoreColor(cashScore.headlines),
      bgColor: getScoreBgColor(cashScore.headlines),
    },
    overall: {
      value: formatScore(cashScore.overall),
      color: getScoreColor(cashScore.overall),
      bgColor: getScoreBgColor(cashScore.overall),
    },
  };
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

