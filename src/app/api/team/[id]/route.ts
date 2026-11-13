import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const updateMemberSchema = z.object({
  isActive: z.boolean().optional(),
  consultationFee: z.number().int().min(0).max(50000).nullable().optional(),
  specialty: z.string().trim().max(80).nullable().optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/team/[id]'>) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR'],
      requireActiveSub: true,
    });
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, updateMemberSchema);

    const member = await prisma.user.findFirst({
      where: { id, clinicId: user.clinicId },
    });
    if (!member) {
      throw new ApiError(404, 'Team member not found.', 'MEMBER_NOT_FOUND');
    }

    if (member.id === user.id && body.isActive === false) {
      throw new ApiError(400, 'You cannot deactivate your own owner account.', 'CANNOT_DEACTIVATE_SELF');
    }

    // Re-activating a deactivated account still respects active seat caps
    if (body.isActive === true && !member.isActive) {
      if (isDoctorRole(member.role)) {
        const count = await prisma.user.count({
          where: { clinicId: user.clinicId, isActive: true, role: { in: ['OWNER_DOCTOR', 'DOCTOR'] } },
        });
        if (count >= user.clinic.maxDoctors) {
          throw new ApiError(403, 'Doctor seat limit reached for this plan.', 'PLAN_LIMIT_REACHED');
        }
      } else {
        const count = await prisma.user.count({
          where: { clinicId: user.clinicId, isActive: true, role: 'STAFF' },
        });
        if (count >= user.clinic.maxStaff) {
          throw new ApiError(403, 'Staff seat limit reached for this plan.', 'PLAN_LIMIT_REACHED');
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: member.id },
      data: body,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialty: true,
        consultationFee: true,
        isActive: true,
      },
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
