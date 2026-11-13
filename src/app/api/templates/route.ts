import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const templateMedicineSchema = z.object({
  medicineName: z.string().trim().min(1).max(160),
  dosage: z.string().trim().max(40).optional(),
  timing: z.string().trim().max(60).optional(),
  durationDays: z.number().int().min(1).max(365).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  diagnosis: z.string().trim().max(300).nullable().optional(),
  clinicalNotes: z.string().trim().max(1000).nullable().optional(),
  followUpDays: z.number().int().min(1).max(365).nullable().optional(),
  medicines: z.array(templateMedicineSchema).min(1).max(20),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'conditionTemplates');

    const templates = await prisma.conditionTemplate.findMany({
      where: { clinicId: user.clinicId },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR', 'DOCTOR'],
      requireActiveSub: true,
    });
    requirePlanFeature(user, 'conditionTemplates');
    const body = await parseJsonBody(request, createTemplateSchema);

    const template = await prisma.conditionTemplate.create({
      data: {
        clinicId: user.clinicId,
        doctorId: user.id,
        name: body.name,
        diagnosis: body.diagnosis || null,
        clinicalNotes: body.clinicalNotes || null,
        followUpDays: body.followUpDays ?? null,
        medicines: body.medicines,
      },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'TEMPLATE_CREATED',
      entityType: 'ConditionTemplate',
      entityId: template.id,
      summary: `Created visit template "${template.name}"`,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
