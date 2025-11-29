'use client';

import { AnalysisResult } from '@/types';
import { exportToPDF } from '@/utils/formatter';

interface ResultViewerProps {
  result: AnalysisResult | null;
}

function getScoreLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 70) {
    return { label: 'Strong', color: 'text-green-700', bgColor: 'bg-green-100' };
  } else if (score >= 40) {
    return { label: 'Decent', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  } else {
    return { label: 'Needs Work', color: 'text-red-700', bgColor: 'bg-red-100' };
  }
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getSeverityColor(severity: 'high' | 'medium' | 'low'): string {
  if (severity === 'high') return 'bg-red-500';
  if (severity === 'medium') return 'bg-orange-500';
  return 'bg-yellow-500';
}

function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  if (priority === 'high') return 'border-red-500';
  if (priority === 'medium') return 'border-orange-500';
  return 'border-yellow-500';
}

// Map business type to CTA display name
function getCTABusinessType(businessType: string): string {
  // Map "Real Estate" to "Property Management" for professional designation
  if (businessType === 'Real Estate') {
    return 'Property Management';
  }
  return businessType;
}

export default function ResultViewer({ result }: ResultViewerProps) {
  if (!result) return null;

  const overallLevel = getScoreLevel(result.scores.overall);
  const contentLevel = getScoreLevel(result.scores.content);
  const authorityLevel = getScoreLevel(result.scores.authority);
  const systemsLevel = getScoreLevel(result.scores.systems);
  const hypergrowthLevel = getScoreLevel(result.scores.hypergrowth);

  // Get most important signal for each category
  const getTopSignal = (signals: typeof result.signals.content) => {
    const sorted = [...signals].sort((a, b) => a.score - b.score);
    return sorted[0] || null;
  };

  const topContentSignal = getTopSignal(result.signals.content);
  const topAuthoritySignal = getTopSignal(result.signals.authority);
  const topSystemsSignal = getTopSignal(result.signals.systems);
  const topHypergrowthSignal = getTopSignal(result.signals.hypergrowth);

  return (
    <div className="w-full max-w-6xl space-y-6" data-result-container>
      {/* Report Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 uppercase font-semibold">Report for:</p>
          <h1 className="text-xl font-bold text-gray-900">{result.url}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Generated on</p>
          <p className="font-medium text-gray-900">{new Date(result.timestamp).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall CASH Score</h2>
            <div className="flex items-center gap-3">
              <span className={`text-5xl font-bold ${overallLevel.color}`}>
                {result.scores.overall}
              </span>
              <span className="text-3xl text-gray-500">/100</span>
            </div>
          </div>
          <div className={`px-6 py-3 rounded-full ${overallLevel.bgColor} ${overallLevel.color} font-semibold text-lg`}>
            {overallLevel.label}
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${getScoreColor(result.scores.overall)} transition-all duration-500`}
              style={{ width: `${result.scores.overall}%` }}
            />
          </div>
        </div>
        {/* Export PDF Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => exportToPDF(result)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report (PDF)
          </button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Content</h3>
            <span className={`text-2xl font-bold ${contentLevel.color}`}>
              {result.scores.content}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full ${getScoreColor(result.scores.content)} transition-all duration-500`}
              style={{ width: `${result.scores.content}%` }}
            />
          </div>
          {topContentSignal && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {topContentSignal.notes}
            </p>
          )}
        </div>

        {/* Authority */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Authority</h3>
            <span className={`text-2xl font-bold ${authorityLevel.color}`}>
              {result.scores.authority}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full ${getScoreColor(result.scores.authority)} transition-all duration-500`}
              style={{ width: `${result.scores.authority}%` }}
            />
          </div>
          {topAuthoritySignal && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {topAuthoritySignal.notes}
            </p>
          )}
        </div>

        {/* Systems */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Systems</h3>
            <span className={`text-2xl font-bold ${systemsLevel.color}`}>
              {result.scores.systems}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full ${getScoreColor(result.scores.systems)} transition-all duration-500`}
              style={{ width: `${result.scores.systems}%` }}
            />
          </div>
          {topSystemsSignal && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {topSystemsSignal.notes}
            </p>
          )}
        </div>

        {/* Hypergrowth */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">Hypergrowth</h3>
            <span className={`text-2xl font-bold ${hypergrowthLevel.color}`}>
              {result.scores.hypergrowth}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full ${getScoreColor(result.scores.hypergrowth)} transition-all duration-500`}
              style={{ width: `${result.scores.hypergrowth}%` }}
            />
          </div>
          {topHypergrowthSignal && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {topHypergrowthSignal.notes}
            </p>
          )}
        </div>
      </div>

      {/* Google Business Profile Audit */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Google Business Profile Audit</h3>
          {result.gmbProfile?.found ? (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Profile Found
            </span>
          ) : (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Profile Not Found
            </span>
          )}
        </div>

        {result.gmbProfile?.found ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">Rating</p>
              <p className={`text-xl font-bold ${(result.gmbProfile.rating || 0) >= 4.5 ? 'text-green-600' : 'text-red-600'}`}>
                {result.gmbProfile.rating || 'N/A'} <span className="text-sm text-gray-400">/ 5.0</span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">Reviews</p>
              <p className={`text-xl font-bold ${(result.gmbProfile.reviewCount || 0) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {result.gmbProfile.reviewCount || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">Last Review</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {result.gmbProfile.lastReviewDate ? new Date(result.gmbProfile.lastReviewDate).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-semibold">GMB Health Score</p>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${getScoreLevel(result.gmbProfile.score).color}`}>
                  {result.gmbProfile.score}
                </span>
                <span className="text-sm text-gray-400">/ 100</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-red-800 font-medium">
              CRITICAL: We could not find a Google Business Profile for this website.
            </p>
            <p className="text-red-600 text-sm mt-1">
              This is a major Authority leak. You are invisible to local search traffic.
            </p>
          </div>
        )}
      </div>

      {/* Yelp Profile Audit (Placeholder for V15 Integration) */}
      {/* 
        NOTE: Full Yelp integration requires a backend scraper update. 
        For now, we are displaying the placeholder structure as requested.
        To fully activate this, we need to update utils/scraper.ts to fetch Yelp data.
      */}
      {/* 
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Yelp Profile Audit</h3>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
            Coming Soon
          </span>
        </div>
        <p className="text-gray-600">Yelp integration is currently being finalized.</p>
      </div> 
      */}

      {/* Critical Issues */}
      {result.priorityIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Critical Issues</h3>
          <div className="space-y-3">
            {result.priorityIssues.slice(0, 5).map((issue) => (
              <div key={issue.id} className="flex items-start gap-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${getSeverityColor(issue.severity)}`} />
                <p className="text-gray-700 flex-1">{issue.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Offers */}
      {result.offers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recommended Offers</h3>
          <div className="space-y-4">
            {result.offers
              .sort((a, b) => {
                // Force AI Receptionist to be first
                if (a.id === 'ai_receptionist') return -1;
                if (b.id === 'ai_receptionist') return 1;
                // Then sort by priority
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
              })
              .map((offer) => (
                <div
                  key={offer.id}
                  className={`w-full p-4 rounded-lg border-2 ${getPriorityColor(offer.priority)} bg-gray-50`}
                >
                  <h4 className="font-semibold text-gray-900 mb-2">{offer.label}</h4>
                  {offer.id === 'ai_receptionist' && offer.monetizedLoss ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-bold text-red-600">URGENT: Your Phone Is Losing You ${offer.monetizedLoss.toLocaleString()}/month.</span>{' '}
                        No online booking system detected. Our AI receptionist handles calls and bookings 24/7.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">{offer.reason}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* VAPI Dynamic CTA */}
      {result.detectedBusinessType && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 border-2 border-blue-700 text-center">
          <a
            href={`https://vapi.ai/demo/${getCTABusinessType(result.detectedBusinessType).toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-md hover:shadow-lg"
          >
            {(() => {
              const aiOffer = result.offers.find(o => o.id === 'ai_receptionist');
              const lossAmount = aiOffer?.monetizedLoss;
              return lossAmount
                ? `Unlock Your $${lossAmount.toLocaleString()} Revenue Leak Today`
                : `Unlock Your Revenue Leak Today`;
            })()}
          </a>
          <p className="mt-4 text-white text-sm opacity-90">
            Stop wasting human time. Start booking tours now.
          </p>
        </div>
      )}

      {/* AI Notes */}
      {result.aiSummary && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">AI Notes</h3>
          <div className="space-y-3 mb-4">
            {result.aiSummary.shortBullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">•</span>
                <p
                  className="text-gray-700 flex-1"
                  dangerouslySetInnerHTML={{ __html: bullet }}
                />
              </div>
            ))}
          </div>
          {result.aiSummary.oneLineHook && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm font-semibold text-gray-700 mb-1">Outreach Hook:</p>
              <p
                className="text-gray-900 font-medium"
                dangerouslySetInnerHTML={{ __html: result.aiSummary.oneLineHook }}
              />
            </div>
          )}
        </div>
      )}

      {/* Request Info (small, bottom) */}
      <div className="text-center text-sm text-gray-500">
        Request ID: {result.requestId}
      </div>
    </div>
  );
}
