'use client';

import { useState, FormEvent } from 'react';

type Step = 'EMAIL' | 'CODE' | 'ANALYZE';

interface URLInputFormProps {
  onSubmit: (url: string, email: string) => void;
  isLoading: boolean;
}

export default function URLInputForm({ onSubmit, isLoading }: URLInputFormProps) {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [url, setUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (!email.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      // Move to code verification step
      setStep('CODE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Move to analyze step
      setStep('ANALYZE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAnalyze = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (url.trim() && !isLoading && step === 'ANALYZE') {
      onSubmit(url.trim(), email.trim());
    }
  };

  // Step 1: Email Input
  if (step === 'EMAIL') {
    return (
      <div className="w-full max-w-2xl">
        <form onSubmit={handleGetCode} className="flex flex-col sm:flex-row gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            disabled={isVerifying}
            required
          />
          <button
            type="submit"
            disabled={isVerifying || !email.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isVerifying ? 'Sending...' : 'Get Code'}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-2 text-sm text-gray-600">
          Check your console for the verification code (mock email service)
        </p>
      </div>
    );
  }

  // Step 2: Code Verification
  if (step === 'CODE') {
    return (
      <div className="w-full max-w-2xl">
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Verification code sent to <strong>{email}</strong>
          </p>
        </div>
        <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-center text-2xl tracking-widest"
            disabled={isVerifying}
            maxLength={6}
            required
          />
          <button
            type="submit"
            disabled={isVerifying || !code.trim() || code.length !== 6}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isVerifying ? 'Verifying...' : 'Verify & Analyze'}
          </button>
        </form>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <button
          onClick={() => {
            setStep('EMAIL');
            setCode('');
            setError(null);
          }}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  // Step 3: URL Input (Original Analyze Step)
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          ✓ Email verified: <strong>{email}</strong>
        </p>
      </div>
      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to analyze (e.g., https://example.com)"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          disabled={isLoading}
          required
        />
        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
    </div>
  );
}
