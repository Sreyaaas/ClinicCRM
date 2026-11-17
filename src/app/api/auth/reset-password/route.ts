import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody } from '@/lib/api';
import { assertRateLimit } from '@/lib/rate-limit';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { verifyPasswordResetToken } from '@/lib/password-reset';
import { recordAuditLog } from '@/lib/audit';

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is missing or invalid.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(100),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, {
      action: 'reset_password_ip',
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: 'Too many attempts. Please try again later.',
    });

    const body = await parseJsonBody(request, resetPasswordSchema);

    const verified = await verifyPasswordResetToken(body.token);
    if (!verified) {
      throw new ApiError(
        400,
        'This password reset link has expired or has already been used. Please request a new one.',
        'TOKEN_INVALID_OR_EXPIRED'
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: verified.userId },
      data: {
        passwordHash: hashPassword(body.password),
      },
      select: {
        id: true,
        name: true,
        clinicId: true,
      },
    });

    await recordAuditLog({
      clinicId: updatedUser.clinicId,
      actorUserId: updatedUser.id,
      actorName: updatedUser.name,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: updatedUser.id,
      summary: `${updatedUser.name} reset their password via email link`,
    });

    return NextResponse.json({
      ok: true,
      message: 'Password has been successfully updated.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
