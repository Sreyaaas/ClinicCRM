import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { getIstDayString } from '@/lib/date';
import { generateNextInvoiceNumber } from '@/lib/invoice-number';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const patchAppointmentSchema = z.object({
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  checkInToQueue: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/appointments/[id]'>
) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'appointments');
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, patchAppointmentSchema);
    const features = getPlanFeatures(user.clinic.planTier);

    const existing = await prisma.appointment.findFirst({
      where: { id, clinicId: user.clinicId },
      include: {
        doctor: { select: { id: true, consultationFee: true } },
      },
    });

    if (!existing) {
      throw new ApiError(404, 'Appointment not found.', 'APPOINTMENT_NOT_FOUND');
    }

    if (body.checkInToQueue) {
      if (!features.queueWorkflow) {
        throw new ApiError(403, 'Walk-in token check-in queue requires Clinic Core or higher.', 'PLAN_UPGRADE_REQUIRED');
      }
      if (existing.queueEntryId) {
        throw new ApiError(409, 'Patient is already checked into the live queue.', 'ALREADY_QUEUED');
      }

      const queueDay = getIstDayString();
      const updated = await prisma.$transaction(async (tx) => {
        const last = await tx.queueEntry.findFirst({
          where: { clinicId: user.clinicId, doctorId: existing.doctorId, queueDay },
          orderBy: { tokenNumber: 'desc' },
          select: { tokenNumber: true },
        });
        const tokenNumber = (last?.tokenNumber ?? 0) + 1;

        const queueEntry = await tx.queueEntry.create({
          data: {
            clinicId: user.clinicId,
            branchId: existing.branchId ?? user.activeBranchId ?? null,
            patientId: existing.patientId,
            doctorId: existing.doctorId,
            queueDay,
            tokenNumber,
            status: 'WAITING',
            notes: existing.reason,
          },
        });

        const feeAmount = existing.doctor.consultationFee ?? user.clinic.defaultConsultFee;
        const invoiceNumber = await generateNextInvoiceNumber(tx, user.clinicId);
        await tx.billingRecord.create({
          data: {
            clinicId: user.clinicId,
            branchId: existing.branchId ?? user.activeBranchId ?? null,
            queueEntryId: queueEntry.id,
            patientId: existing.patientId,
            doctorId: existing.doctorId,
            invoiceNumber,
            amount: feeAmount,
            discount: 0,
            netAmount: feeAmount,
            lineItems: [
              { label: 'OPD Consultation', category: 'CONSULTATION', qty: 1, unitPrice: feeAmount, total: feeAmount },
            ],
            paymentStatus: 'UNPAID',
          },
        });

        return tx.appointment.update({
          where: { id: existing.id },
          data: { status: 'CHECKED_IN', queueEntryId: queueEntry.id },
        });
      });

      return NextResponse.json({ appointment: updated });
    }

    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
      },
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
