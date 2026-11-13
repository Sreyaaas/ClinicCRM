import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const updateQueueSchema = z.object({
  status: z
    .enum(['WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  vitals: z
    .object({
      bp: z.string().trim().max(20).optional(),
      temp: z.string().trim().max(20).optional(),
      pulse: z.string().trim().max(20).optional(),
      weight: z.string().trim().max(20).optional(),
      spo2: z.string().trim().max(20).optional(),
    })
    .optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/queue/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, updateQueueSchema);

    const existing = await prisma.queueEntry.findFirst({
      where: { id, clinicId: user.clinicId },
    });
    if (!existing) {
      throw new ApiError(404, 'Queue entry not found.', 'QUEUE_NOT_FOUND');
    }

    const updated = await prisma.queueEntry.update({
      where: { id: existing.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.status === 'IN_CONSULTATION' && !existing.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(body.status === 'COMPLETED' && !existing.completedAt
          ? { completedAt: new Date() }
          : {}),
        ...(body.vitals !== undefined ? { vitals: body.vitals } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
