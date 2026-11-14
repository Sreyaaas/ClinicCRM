import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserSession } from '@/lib/auth';
import { ApiError, handleApiError, parseJsonBody } from '@/lib/api';
import { assertRateLimit } from '@/lib/rate-limit';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    assertRateLimit(request, {
      action: 'login_ip',
      limit: 20,
      windowMs: 5 * 60 * 1000,
      message: 'Too many login attempts from this network. Please wait a few minutes.',
    });

    const body = await parseJsonBody(request, loginSchema);

    assertRateLimit(request, {
      action: 'login_account',
      limit: 10,
      windowMs: 5 * 60 * 1000,
      customKey: body.email,
      message: 'Too many login attempts for this account. Please wait a few minutes.',
    });

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { clinic: true },
    });

    if (!user || !user.isActive || !verifyPassword(body.password, user.passwordHash)) {
      throw new ApiError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    await createUserSession(user.id, user.clinicId);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic.name,
        planTier: user.clinic.planTier,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
