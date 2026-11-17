import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { getIstDayBounds, getIstDayString } from '@/lib/date';
import { generateNextInvoiceNumber } from '@/lib/invoice-number';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { getQueueLockKey } from '@/lib/slot-lock';

const createQueueSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  branchId: z.string().uuid().nullable().optional(),
  queueDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
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
  feeAmount: z.number().int().min(0).max(50000).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'queueWorkflow');

    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day') ?? getIstDayString();
    const doctorIdFilter = searchParams.get('doctorId');
    const branchIdFilter = searchParams.get('branchId');
    const { start, end } = getIstDayBounds(day);

    const [entries, doctors] = await Promise.all([
      prisma.queueEntry.findMany({
        where: {
          clinicId: user.clinicId,
          queueDay: day,
          ...(doctorIdFilter ? { doctorId: doctorIdFilter } : {}),
          ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
        },
        orderBy: [{ tokenNumber: 'asc' }],
        include: {
          patient: {
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
              _count: {
                select: { visits: true, documents: true },
              },
              documents: {
                where: { reportDate: { gte: start, lte: end } },
                select: { id: true, title: true, docType: true },
              },
            },
          },
          doctor: {
            select: { id: true, name: true, specialty: true, consultationFee: true },
          },
          billingRecords: {
            select: {
              id: true,
              invoiceNumber: true,
              netAmount: true,
              paymentStatus: true,
              paymentMode: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: {
          clinicId: user.clinicId,
          isActive: true,
          role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, specialty: true, consultationFee: true, role: true },
      }),
    ]);

    return NextResponse.json({ queueDay: day, entries, doctors });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'queueWorkflow');

    const body = await parseJsonBody(request, createQueueSchema);
    const queueDay = body.queueDay ?? getIstDayString();
    const targetDoctorId =
      body.doctorId ?? (isDoctorRole(user.role) ? user.id : undefined);

    if (!targetDoctorId) {
      throw new ApiError(400, 'Please select a doctor for check-in.', 'DOCTOR_REQUIRED');
    }

    const [patient, doctor] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: body.patientId, clinicId: user.clinicId },
        select: { id: true, name: true },
      }),
      prisma.user.findFirst({
        where: {
          id: targetDoctorId,
          clinicId: user.clinicId,
          isActive: true,
          role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
        },
        select: { id: true, consultationFee: true },
      }),
    ]);

    if (!patient) {
      throw new ApiError(404, 'Patient not found in your clinic.', 'PATIENT_NOT_FOUND');
    }
    if (!doctor) {
      throw new ApiError(404, 'Selected doctor not found.', 'DOCTOR_NOT_FOUND');
    }

    const feeAmount = body.feeAmount ?? doctor.consultationFee ?? user.clinic.defaultConsultFee;
    const paymentStatus = body.paymentStatus ?? 'UNPAID';
    const resolvedBranchId = body.branchId ?? user.activeBranchId ?? null;

    let created = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          // Atomic lock for this doctor on this queue day to prevent duplicate tokens under concurrency
          const queueLockKey = getQueueLockKey(user.clinicId, doctor.id, queueDay);
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${queueLockKey}::bigint);`;

          const lastEntry = await tx.queueEntry.findFirst({
            where: {
              clinicId: user.clinicId,
              doctorId: doctor.id,
              queueDay,
            },
            orderBy: { tokenNumber: 'desc' },
            select: { tokenNumber: true },
          });

          const nextToken = (lastEntry?.tokenNumber ?? 0) + 1;

          const queueEntry = await tx.queueEntry.create({
            data: {
              clinicId: user.clinicId,
              branchId: resolvedBranchId,
              patientId: patient.id,
              doctorId: doctor.id,
              queueDay,
              tokenNumber: nextToken,
              status: 'WAITING',
              vitals: body.vitals ?? undefined,
              notes: body.notes || null,
            },
            include: {
              patient: {
                select: { id: true, patientCode: true, name: true, phone: true },
              },
              doctor: {
                select: { id: true, name: true, specialty: true },
              },
            },
          });

          const invoiceNumber = await generateNextInvoiceNumber(tx, user.clinicId);
          await tx.billingRecord.create({
            data: {
              clinicId: user.clinicId,
              branchId: resolvedBranchId,
              queueEntryId: queueEntry.id,
              patientId: patient.id,
              doctorId: doctor.id,
              invoiceNumber,
              amount: feeAmount,
              discount: 0,
              gstRatePercent: 0,
              gstAmount: 0,
              netAmount: feeAmount,
              lineItems: [
                {
                  label: 'OPD Consultation',
                  category: 'CONSULTATION',
                  qty: 1,
                  unitPrice: feeAmount,
                  total: feeAmount,
                },
              ],
              paymentStatus,
              paymentMode: paymentStatus === 'UNPAID' ? null : (body.paymentMode ?? 'CASH'),
              collectedByUserId: paymentStatus === 'UNPAID' ? null : user.id,
              collectedAt: paymentStatus === 'UNPAID' ? null : new Date(),
            },
          });

          return queueEntry;
        });
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && attempt < 2) {
          continue;
        }
        throw err;
      }
    }

    if (!created) {
      throw new ApiError(500, 'Could not assign token number. Please retry.', 'TOKEN_RETRY_FAILED');
    }

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'QUEUE_TOKEN_ISSUED',
      entityType: 'QueueEntry',
      entityId: created.id,
      summary: `Issued Token #${created.tokenNumber} for ${patient.name}`,
    });

    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
