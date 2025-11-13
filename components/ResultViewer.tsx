'use client';

import { AnalysisResult } from '@/types';
import { formatCASHScore, formatTimestamp, truncateText } from '@/utils/formatter';

interface ResultViewerProps {
  result: AnalysisResult | null;
}

export default function ResultViewer({ result }: ResultViewerProps) {
  if (!result) return null;

  const formattedScores = formatCASHScore(result.cashScore);

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
          <span className="text-sm text-gray-500">Request ID: {result.requestId}</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">URL:</span>{' '}
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {result.url}
            </a>
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Analyzed:</span> {formatTimestamp(result.timestamp)}
          </p>
        </div>
      </div>

      {/* CASH Scores */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">C.A.S.H. Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Overall Score - Highlighted */}
          <div className="lg:col-span-5 mb-2">
            <div className={`${formattedScores.overall.bgColor} rounded-lg p-4 border-2 border-gray-200`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Overall Score</span>
                <span className={`text-3xl font-bold ${formattedScores.overall.color}`}>
                  {formattedScores.overall.value}
                </span>
              </div>
            </div>
          </div>

          {/* Individual Scores */}
          <div className={`${formattedScores.clarity.bgColor} rounded-lg p-4`}>
            <div className="text-sm font-semibold text-gray-700 mb-1">Clarity</div>
            <div className={`text-2xl font-bold ${formattedScores.clarity.color}`}>
              {formattedScores.clarity.value}
            </div>
          </div>

          <div className={`${formattedScores.authority.bgColor} rounded-lg p-4`}>
            <div className="text-sm font-semibold text-gray-700 mb-1">Authority</div>
            <div className={`text-2xl font-bold ${formattedScores.authority.color}`}>
              {formattedScores.authority.value}
            </div>
          </div>

          <div className={`${formattedScores.structure.bgColor} rounded-lg p-4`}>
            <div className="text-sm font-semibold text-gray-700 mb-1">Structure</div>
            <div className={`text-2xl font-bold ${formattedScores.structure.color}`}>
              {formattedScores.structure.value}
            </div>
          </div>

          <div className={`${formattedScores.headlines.bgColor} rounded-lg p-4`}>
            <div className="text-sm font-semibold text-gray-700 mb-1">Headlines</div>
            <div className={`text-2xl font-bold ${formattedScores.headlines.color}`}>
              {formattedScores.headlines.value}
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">AI Analysis</h3>
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {result.aiAnalysis}
          </p>
        </div>
      </div>

      {/* Scraped Content Preview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Content Preview</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Title:</h4>
            <p className="text-gray-700">{result.scrapedContent.title}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">
              Headings ({result.scrapedContent.headings.length}):
            </h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {result.scrapedContent.headings.slice(0, 10).map((heading, idx) => (
                <li key={idx}>{truncateText(heading, 100)}</li>
              ))}
              {result.scrapedContent.headings.length > 10 && (
                <li className="text-gray-500 italic">
                  ... and {result.scrapedContent.headings.length - 10} more
                </li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Text Preview:</h4>
            <p className="text-gray-700">{truncateText(result.scrapedContent.text, 500)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

