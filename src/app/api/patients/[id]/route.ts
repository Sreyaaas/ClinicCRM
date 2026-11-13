import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const updatePatientSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
  ageYears: z.number().int().min(0).max(130).nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  place: z.string().trim().max(100).nullable().optional(),
  allergies: z.string().trim().max(300).nullable().optional(),
  chronicConditions: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/patients/[id]'>) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;

    const patient = await prisma.patient.findFirst({
      where: { id, clinicId: user.clinicId },
      include: {
        visits: {
          orderBy: { visitedAt: 'desc' },
          include: {
            doctor: {
              select: { id: true, name: true, specialty: true },
            },
            prescriptions: {
              orderBy: { sortOrder: 'asc' },
            },
            documents: {
              orderBy: { reportDate: 'desc' },
            },
            billingRecords: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        documents: {
          orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            uploadedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        billingRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { select: { id: true, name: true } },
          },
        },
        clinicalOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found.', 'PATIENT_NOT_FOUND');
    }

    const familyMembers = await prisma.patient.findMany({
      where: {
        clinicId: user.clinicId,
        phone: patient.phone,
        id: { not: patient.id },
      },
      select: {
        id: true,
        patientCode: true,
        name: true,
        ageYears: true,
        gender: true,
      },
    });

    return NextResponse.json({ patient, familyMembers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/patients/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, updatePatientSchema);

    const existing = await prisma.patient.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!existing) {
      throw new ApiError(404, 'Patient not found.', 'PATIENT_NOT_FOUND');
    }

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: body,
    });

    return NextResponse.json({ patient });
  } catch (error) {
    return handleApiError(error);
  }
}
