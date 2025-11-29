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

// Legacy formatter - kept for backward compatibility if needed
// Note: CASHScore structure changed in v2 (content, authority, systems, hypergrowth)
export function formatCASHScore(cashScore: CASHScore): {
  content: { value: string; color: string; bgColor: string };
  authority: { value: string; color: string; bgColor: string };
  systems: { value: string; color: string; bgColor: string };
  hypergrowth: { value: string; color: string; bgColor: string };
  overall: { value: string; color: string; bgColor: string };
} {
  return {
    content: {
      value: formatScore(cashScore.content),
      color: getScoreColor(cashScore.content),
      bgColor: getScoreBgColor(cashScore.content),
    },
    authority: {
      value: formatScore(cashScore.authority),
      color: getScoreColor(cashScore.authority),
      bgColor: getScoreBgColor(cashScore.authority),
    },
    systems: {
      value: formatScore(cashScore.systems),
      color: getScoreColor(cashScore.systems),
      bgColor: getScoreBgColor(cashScore.systems),
    },
    hypergrowth: {
      value: formatScore(cashScore.hypergrowth),
      color: getScoreColor(cashScore.hypergrowth),
      bgColor: getScoreBgColor(cashScore.hypergrowth),
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

// PDF Export Function
export async function exportToPDF(result: AnalysisResult): Promise<void> {
  try {
    // Dynamic import for client-side only libraries
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).jsPDF;

    // Find the main result container
    const element = document.querySelector('[data-result-container]') as HTMLElement;
    if (!element) {
      // Fallback: try to find the overall score card
      const scoreCard = document.querySelector('.bg-white.rounded-lg.shadow-lg') as HTMLElement;
      if (!scoreCard) {
        throw new Error('Could not find result container to export');
      }
      await exportElementToPDF(scoreCard, result, html2canvas, jsPDF);
      return;
    }

    await exportElementToPDF(element, result, html2canvas, jsPDF);
  } catch (error) {
    // Fallback: Simple text-based PDF using blob
    console.warn('PDF export with html2canvas failed, using fallback method:', error);
    await exportSimplePDF(result);
  }
}

async function exportElementToPDF(
  element: HTMLElement,
  result: AnalysisResult,
  html2canvas: any,
  jsPDF: any
): Promise<void> {
  // Capture the element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  // Generate filename with date and domain
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  // Strip protocol and www for clean filename
  const domain = result.url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const filename = `CASH_${domain}_Report_${date}.pdf`;

  // Save the PDF
  pdf.save(filename);
}

async function exportSimplePDF(result: AnalysisResult): Promise<void> {
  // Fallback: Create a simple text-based PDF using blob
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const filename = `CASH_Audit_${date}.pdf`;

  // Create PDF content as text (simple fallback)
  const content = `
C.A.S.H. Analyzer Report
Generated: ${new Date().toLocaleString()}
URL: ${result.url}

Overall CASH Score: ${result.scores.overall}/100
Content: ${result.scores.content}/100
Authority: ${result.scores.authority}/100
Systems: ${result.scores.systems}/100
Hypergrowth: ${result.scores.hypergrowth}/100

${result.priorityIssues.length > 0 ? 'Critical Issues:\n' + result.priorityIssues.map(i => `- ${i.label}`).join('\n') : ''}

${result.offers.length > 0 ? 'Recommended Offers:\n' + result.offers.map(o => `- ${o.label}: ${o.reason}`).join('\n') : ''}
  `.trim();

  // Create blob and download
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace('.pdf', '.txt'); // Fallback to .txt if PDF generation fails
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
