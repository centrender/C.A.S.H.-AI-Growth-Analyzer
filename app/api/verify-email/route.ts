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

      // Send email via SendGrid
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        try {
          const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: email }]
              }],
              from: { email: process.env.SENDGRID_FROM_EMAIL },
              subject: 'Your C.A.S.H. Analyzer Verification Code',
              content: [{
                type: 'text/plain',
                value: `Your verification code is: ${verificationCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
              }]
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('SendGrid API Error:', errorData);
            return NextResponse.json({
              success: false,
              error: 'Failed to send email. Please check server logs or use test@example.com.',
            }, { status: 500 });
          }
        } catch (error) {
          console.error('Failed to send email:', error);
          return NextResponse.json({
            success: false,
            error: 'Failed to send email. System error.',
          }, { status: 500 });
        }
      } else {
        // Fallback for development if keys are missing
        console.warn('SendGrid credentials not found. Logging code to console.');
        console.log(`Sending verification code ${verificationCode} to ${email}`);

        return NextResponse.json({
          success: true,
          message: 'DEV MODE: Keys missing. Check Vercel Logs for code.',
        });
      }

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

