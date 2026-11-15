import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { assertDemoPatientLimit, isDemoUser } from '@/lib/demo-restriction';
import { generateNextPatientCode } from '@/lib/patient-code';
import { PLAN_DEFAULTS } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const createPatientSchema = z.object({
  name: z.string().trim().min(1, 'Patient name is required').max(120),
  phone: z.string().trim().min(6, 'Phone number is required').max(20),
  ageYears: z.number().int().min(0).max(130).nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  place: z.string().trim().max(100).nullable().optional(),
  allergies: z.string().trim().max(300).nullable().optional(),
  chronicConditions: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const isNumeric = /^\d+$/.test(q);

    const where: Prisma.PatientWhereInput = {
      clinicId: user.clinicId,
      ...(q
        ? isNumeric
          ? {
              OR: [
                { phone: { startsWith: q } },
                { patientCode: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { patientCode: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { place: { contains: q, mode: 'insensitive' } },
              ],
            }
        : {}),
    };

    const isDemo = isDemoUser(user);

    const patients = await prisma.patient.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: isDemo ? 2 : 40,
      select: {
        id: true,
        patientCode: true,
        name: true,
        phone: true,
        ageYears: true,
        gender: true,
        place: true,
        allergies: true,
        chronicConditions: true,
        updatedAt: true,
        _count: {
          select: { visits: true, documents: true },
        },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 1,
          select: {
            visitedAt: true,
            diagnosis: true,
            chiefComplaint: true,
          },
        },
      },
    });

    return NextResponse.json({ patients });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    await assertDemoPatientLimit(user);
    const body = await parseJsonBody(request, createPatientSchema);

    if (user.clinic.maxPatients !== null) {
      const currentPatientCount = await prisma.patient.count({
        where: { clinicId: user.clinicId },
      });
      if (currentPatientCount >= user.clinic.maxPatients) {
        throw new ApiError(
          403,
          `Your ${user.clinic.planTier} plan is limited to ${user.clinic.maxPatients} patients. Upgrade to Solo Pro (₹${PLAN_DEFAULTS.SOLO.monthlyPriceInr.toLocaleString('en-IN')}/mo) for unlimited patients.`,
          'PLAN_LIMIT_REACHED'
        );
      }
    }

    let createdPatient = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        createdPatient = await prisma.$transaction(async (tx) => {
          const patientCode = await generateNextPatientCode(tx, user.clinicId);
          return tx.patient.create({
            data: {
              clinicId: user.clinicId,
              patientCode,
              name: body.name,
              phone: body.phone,
              ageYears: body.ageYears ?? null,
              gender: body.gender ?? null,
              place: body.place || null,
              allergies: body.allergies || null,
              chronicConditions: body.chronicConditions || null,
              notes: body.notes || null,
            },
          });
        });
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < 2) {
          continue;
        }
        throw err;
      }
    }

    if (!createdPatient) {
      throw new ApiError(500, 'Failed to allocate patient code.', 'CODE_GENERATION_FAILED');
    }

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'PATIENT_CREATED',
      entityType: 'Patient',
      entityId: createdPatient.id,
      summary: `Created patient ${createdPatient.name} (${createdPatient.patientCode})`,
    });

    const familyMatches = await prisma.patient.findMany({
      where: {
        clinicId: user.clinicId,
        phone: createdPatient.phone,
        id: { not: createdPatient.id },
      },
      select: { id: true, name: true, ageYears: true, patientCode: true },
    });

    return NextResponse.json({ patient: createdPatient, familyMatches }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
