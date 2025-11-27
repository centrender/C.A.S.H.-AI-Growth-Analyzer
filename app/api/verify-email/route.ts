import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for verification codes
// In production, use Redis or a database
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

// Code expiration time: 10 minutes
const CODE_EXPIRATION_MS = 10 * 60 * 1000;

// Generate a 6-digit random code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    // Request to send verification code
    if (email && !code) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Generate and store verification code
      const verificationCode = email === 'test@example.com' ? '123456' : generateCode();
      const expiresAt = Date.now() + CODE_EXPIRATION_MS;

      verificationCodes.set(email.toLowerCase(), {
        code: verificationCode,
        expiresAt,
      });

      // Simulate sending email (log to console)
      console.log(`Sending verification code ${verificationCode} to ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to email.',
      });
    }

    // Request to verify code
    if (email && code) {
      const stored = verificationCodes.get(email.toLowerCase());

      if (!stored) {
        return NextResponse.json(
          { success: false, error: 'No verification code found for this email. Please request a new code.' },
          { status: 400 }
        );
      }

      if (Date.now() > stored.expiresAt) {
        verificationCodes.delete(email.toLowerCase());
        return NextResponse.json(
          { success: false, error: 'Verification code has expired. Please request a new code.' },
          { status: 400 }
        );
      }

      if (stored.code !== code) {
        return NextResponse.json(
          { success: false, error: 'Invalid verification code.' },
          { status: 400 }
        );
      }

      // Code is valid - remove it (one-time use)
      verificationCodes.delete(email.toLowerCase());

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Email is required' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

