import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { generateNextInvoiceNumber } from '@/lib/invoice-number';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const prescriptionItemSchema = z.object({
  medicineName: z.string().trim().min(1).max(160),
  dosage: z.string().trim().max(40).nullable().optional(),
  timing: z.string().trim().max(60).nullable().optional(),
  durationDays: z.number().int().min(1).max(365).nullable().optional(),
  instructions: z.string().trim().max(200).nullable().optional(),
});

const vitalsSchema = z
  .object({
    bp: z.string().trim().max(20).optional(),
    temp: z.string().trim().max(20).optional(),
    pulse: z.string().trim().max(20).optional(),
    weight: z.string().trim().max(20).optional(),
    spo2: z.string().trim().max(20).optional(),
  })
  .optional();

const createVisitSchema = z.object({
  patientId: z.string().uuid(),
  queueEntryId: z.string().uuid().optional(),
  branchId: z.string().uuid().nullable().optional(),
  chiefComplaint: z.string().trim().max(500).nullable().optional(),
  vitals: vitalsSchema,
  diagnosis: z.string().trim().max(500).nullable().optional(),
  clinicalNotes: z.string().trim().max(2000).nullable().optional(),
  followUpDate: z.string().trim().nullable().optional(),
  followUpReason: z.string().trim().max(240).nullable().optional(),
  prescriptions: z.array(prescriptionItemSchema).max(40).default([]),
  saveNewPresets: z.boolean().optional(),
  markPreviousFollowUpsDone: z.boolean().optional(),
  feeAmount: z.number().int().min(0).max(50000).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR', 'DOCTOR'],
      requireActiveSub: true,
    });
    const body = await parseJsonBody(request, createVisitSchema);
    const features = getPlanFeatures(user.clinic.planTier);

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: user.clinicId },
      select: { id: true, name: true },
    });
    if (!patient) {
      throw new ApiError(404, 'Patient not found in your clinic.', 'PATIENT_NOT_FOUND');
    }

    if (body.queueEntryId) {
      const queue = await prisma.queueEntry.findFirst({
        where: { id: body.queueEntryId, clinicId: user.clinicId },
        select: { id: true, patientId: true },
      });
      if (!queue || queue.patientId !== patient.id) {
        throw new ApiError(404, 'Queue entry does not match patient.', 'QUEUE_MISMATCH');
      }
    }

    const parsedFollowUp =
      body.followUpDate && body.followUpDate.trim() !== ''
        ? new Date(`${body.followUpDate}T10:00:00.000+05:30`)
        : null;

    if (parsedFollowUp && Number.isNaN(parsedFollowUp.getTime())) {
      throw new ApiError(400, 'Invalid follow-up date.', 'INVALID_DATE');
    }

    const resolvedBranchId = body.branchId ?? user.activeBranchId ?? null;

    const visit = await prisma.$transaction(async (tx) => {
      if (body.markPreviousFollowUpsDone) {
        await tx.visit.updateMany({
          where: {
            clinicId: user.clinicId,
            patientId: patient.id,
            followUpStatus: { in: ['PENDING', 'REMINDED'] },
          },
          data: { followUpStatus: 'COMPLETED' },
        });
      }

      const created = await tx.visit.create({
        data: {
          clinicId: user.clinicId,
          branchId: resolvedBranchId,
          patientId: patient.id,
          doctorId: user.id,
          chiefComplaint: body.chiefComplaint || null,
          vitals: body.vitals ?? undefined,
          diagnosis: body.diagnosis || null,
          clinicalNotes: body.clinicalNotes || null,
          followUpDate: parsedFollowUp,
          followUpReason: body.followUpReason || null,
          followUpStatus: 'PENDING',
          prescriptions: {
            create: body.prescriptions.map((item, idx) => ({
              clinicId: user.clinicId,
              medicineName: item.medicineName,
              dosage: item.dosage || null,
              timing: item.timing || null,
              durationDays: item.durationDays ?? null,
              instructions: item.instructions || null,
              sortOrder: idx,
            })),
          },
        },
        include: {
          doctor: { select: { id: true, name: true, specialty: true } },
          prescriptions: { orderBy: { sortOrder: 'asc' } },
        },
      });

      if (body.queueEntryId) {
        await tx.queueEntry.update({
          where: { id: body.queueEntryId },
          data: {
            visitId: created.id,
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        await tx.appointment.updateMany({
          where: { queueEntryId: body.queueEntryId, clinicId: user.clinicId },
          data: { status: 'COMPLETED' },
        });

        await tx.billingRecord.updateMany({
          where: { queueEntryId: body.queueEntryId, clinicId: user.clinicId, visitId: null },
          data: { visitId: created.id },
        });
      }

      if (typeof body.feeAmount === 'number' && features.billing) {
        const existingBill = body.queueEntryId
          ? await tx.billingRecord.findFirst({
              where: { queueEntryId: body.queueEntryId, clinicId: user.clinicId },
            })
          : null;

        if (!existingBill) {
          const invoiceNumber = await generateNextInvoiceNumber(tx, user.clinicId);
          await tx.billingRecord.create({
            data: {
              clinicId: user.clinicId,
              branchId: resolvedBranchId,
              visitId: created.id,
              queueEntryId: body.queueEntryId ?? null,
              patientId: patient.id,
              doctorId: user.id,
              invoiceNumber,
              amount: body.feeAmount,
              discount: 0,
              gstRatePercent: 0,
              gstAmount: 0,
              netAmount: body.feeAmount,
              lineItems: [
                {
                  label: 'OPD Consultation',
                  category: 'CONSULTATION',
                  qty: 1,
                  unitPrice: body.feeAmount,
                  total: body.feeAmount,
                },
              ],
              paymentStatus: body.paymentStatus ?? 'PAID',
              paymentMode: body.paymentStatus === 'UNPAID' ? null : (body.paymentMode ?? 'CASH'),
              collectedByUserId: body.paymentStatus === 'UNPAID' ? null : user.id,
              collectedAt: body.paymentStatus === 'UNPAID' ? null : new Date(),
            },
          });
        }
      }

      if (body.saveNewPresets && body.prescriptions.length > 0) {
        const itemNames = body.prescriptions.map((p) => p.medicineName.trim());
        const existingPresets = await tx.clinicMedicinePreset.findMany({
          where: {
            clinicId: user.clinicId,
            medicineName: { in: itemNames, mode: 'insensitive' },
          },
        });

        const existingMap = new Map(
          existingPresets.map((ep) => [ep.medicineName.toLowerCase(), ep])
        );

        const updates: Promise<unknown>[] = [];
        const toCreate: Array<{
          clinicId: string;
          doctorId: string;
          medicineName: string;
          defaultDosage: string | null;
          defaultTiming: string | null;
          defaultDuration: number | null;
          instructions: string | null;
          usageCount: number;
        }> = [];

        for (const item of body.prescriptions) {
          const trimmed = item.medicineName.trim();
          const match = existingMap.get(trimmed.toLowerCase());
          if (match && match.id !== 'pending') {
            updates.push(
              tx.clinicMedicinePreset.update({
                where: { id: match.id },
                data: { usageCount: { increment: 1 } },
              })
            );
          } else if (!match) {
            toCreate.push({
              clinicId: user.clinicId,
              doctorId: user.id,
              medicineName: trimmed,
              defaultDosage: item.dosage || null,
              defaultTiming: item.timing || null,
              defaultDuration: item.durationDays ?? null,
              instructions: item.instructions || null,
              usageCount: 1,
            });
            existingMap.set(trimmed.toLowerCase(), { id: 'pending', medicineName: trimmed } as (typeof existingPresets)[number]);
          }
        }

        if (toCreate.length > 0) {
          updates.push(
            tx.clinicMedicinePreset.createMany({
              data: toCreate,
            })
          );
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      }

      await tx.patient.update({
        where: { id: patient.id },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'VISIT_RECORDED',
      entityType: 'Visit',
      entityId: visit.id,
      summary: `Recorded visit for ${patient.name} (${body.prescriptions.length} Rx item(s))`,
    });

    return NextResponse.json({ visit }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
