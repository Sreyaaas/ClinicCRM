import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ApiError, handleApiError, requireApiUser, requirePlanFeature } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/templates/[id]'>) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR', 'DOCTOR'],
      requireActiveSub: true,
    });
    requirePlanFeature(user, 'conditionTemplates');
    const { id } = await ctx.params;

    const existing = await prisma.conditionTemplate.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!existing) {
      throw new ApiError(404, 'Condition template not found.', 'NOT_FOUND');
    }

    await prisma.conditionTemplate.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
