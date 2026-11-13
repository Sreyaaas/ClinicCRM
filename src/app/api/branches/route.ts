import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9_-]/g, '')),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(250).nullable().optional(),
});

const selectBranchSchema = z.object({
  branchId: z.string().uuid().nullable(),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const branches = await prisma.branch.findMany({
      where: { clinicId: user.clinicId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return NextResponse.json({ branches, activeBranchId: user.activeBranchId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ roles: ['OWNER_DOCTOR'], requireActiveSub: true });
    requirePlanFeature(user, 'multiBranch');
    const body = await parseJsonBody(request, createBranchSchema);

    const existingCount = await prisma.branch.count({
      where: { clinicId: user.clinicId, isActive: true },
    });
    if (existingCount >= user.clinic.maxBranches) {
      throw new ApiError(
        403,
        `Your plan allows up to ${user.clinic.maxBranches} active clinic branches.`,
        'BRANCH_LIMIT_REACHED'
      );
    }

    const branch = await prisma.branch.create({
      data: {
        clinicId: user.clinicId,
        name: body.name,
        code: body.code || `BR${existingCount + 1}`,
        phone: body.phone || null,
        address: body.address || null,
        isDefault: existingCount === 0,
      },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'BRANCH_CREATED',
      entityType: 'Branch',
      entityId: branch.id,
      summary: `Added branch ${branch.name} (${branch.code})`,
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    const body = await parseJsonBody(request, selectBranchSchema);

    if (body.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: body.branchId, clinicId: user.clinicId, isActive: true },
        select: { id: true },
      });
      if (!branch) throw new ApiError(404, 'Branch not found.', 'BRANCH_NOT_FOUND');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { activeBranchId: body.branchId },
    });

    return NextResponse.json({ activeBranchId: body.branchId });
  } catch (error) {
    return handleApiError(error);
  }
}
