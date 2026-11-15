import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { assertDemoMutationAllowed } from '@/lib/demo-restriction';
import { hashPassword, verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    assertDemoMutationAllowed(user, 'Changing account passwords');
    const body = await parseJsonBody(request, changePasswordSchema);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, passwordHash: true },
    });
    if (!dbUser || !verifyPassword(body.currentPassword, dbUser.passwordHash)) {
      throw new ApiError(401, 'Current password is incorrect.', 'INVALID_PASSWORD');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(body.newPassword) },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.id,
      summary: `${user.name} updated account password`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
