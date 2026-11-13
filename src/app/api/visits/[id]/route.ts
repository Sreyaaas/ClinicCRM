import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const updateVisitSchema = z.object({
  followUpStatus: z.enum(['PENDING', 'REMINDED', 'COMPLETED', 'MISSED']).optional(),
  followUpDate: z.string().trim().nullable().optional(),
  followUpReason: z.string().trim().max(240).nullable().optional(),
  chiefComplaint: z.string().trim().max(500).nullable().optional(),
  diagnosis: z.string().trim().max(500).nullable().optional(),
  clinicalNotes: z.string().trim().max(2000).nullable().optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/visits/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, updateVisitSchema);

    const existing = await prisma.visit.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!existing) {
      throw new ApiError(404, 'Visit not found.', 'VISIT_NOT_FOUND');
    }

    const hasClinicalEdits =
      body.chiefComplaint !== undefined ||
      body.diagnosis !== undefined ||
      body.clinicalNotes !== undefined ||
      body.followUpDate !== undefined ||
      body.followUpReason !== undefined;

    if (hasClinicalEdits && !isDoctorRole(user.role)) {
      throw new ApiError(403, 'Only doctors can edit clinical visit details.', 'FORBIDDEN');
    }

    const visit = await prisma.visit.update({
      where: { id: existing.id },
      data: {
        ...(body.followUpStatus !== undefined ? { followUpStatus: body.followUpStatus } : {}),
        ...(body.followUpReason !== undefined ? { followUpReason: body.followUpReason } : {}),
        ...(body.chiefComplaint !== undefined ? { chiefComplaint: body.chiefComplaint } : {}),
        ...(body.diagnosis !== undefined ? { diagnosis: body.diagnosis } : {}),
        ...(body.clinicalNotes !== undefined ? { clinicalNotes: body.clinicalNotes } : {}),
        ...(body.followUpDate !== undefined
          ? {
              followUpDate: body.followUpDate
                ? new Date(`${body.followUpDate}T10:00:00.000+05:30`)
                : null,
            }
          : {}),
      },
    });

    return NextResponse.json({ visit });
  } catch (error) {
    return handleApiError(error);
  }
}
