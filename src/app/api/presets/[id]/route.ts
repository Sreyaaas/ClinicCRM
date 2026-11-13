import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ApiError, handleApiError, requireApiUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/presets/[id]'>) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR', 'DOCTOR'],
      requireActiveSub: true,
    });
    const { id } = await ctx.params;

    const existing = await prisma.clinicMedicinePreset.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!existing) {
      throw new ApiError(404, 'Preset not found.', 'PRESET_NOT_FOUND');
    }

    await prisma.clinicMedicinePreset.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
