import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserSession } from '@/lib/auth';
import { ApiError, handleApiError, parseJsonBody } from '@/lib/api';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, loginSchema);

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
