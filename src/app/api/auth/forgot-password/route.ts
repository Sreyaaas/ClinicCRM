import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody } from '@/lib/api';
import { assertRateLimit } from '@/lib/rate-limit';
import { isDemoUser } from '@/lib/demo-restriction';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/email';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, {
      action: 'forgot_password_ip',
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: 'Too many password reset requests. Please wait a few minutes.',
    });

    const body = await parseJsonBody(request, forgotPasswordSchema);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, name: true, email: true, passwordHash: true, isActive: true },
    });

    // If user does not exist, return generic success to prevent email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({
        ok: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    if (isDemoUser(user)) {
      throw new ApiError(400, 'Demo accounts cannot reset passwords.', 'DEMO_RESTRICTED');
    }

    const token = await createPasswordResetToken(user);

    // Determine request origin for the reset URL
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    const resetUrl = `${proto}://${host}/reset-password?token=${encodeURIComponent(token)}`;

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetUrl,
    });

    if (!emailResult.ok) {
      throw new ApiError(500, emailResult.error || 'Failed to dispatch reset email.', 'EMAIL_SEND_FAILED');
    }

    return NextResponse.json({
      ok: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
