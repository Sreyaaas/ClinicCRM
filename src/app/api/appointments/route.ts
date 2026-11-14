import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { getIstDayBounds, getIstDayString } from '@/lib/date';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { getSlotLockKey } from '@/lib/slot-lock';

const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().optional(),
  branchId: z.string().uuid().nullable().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(5).max(120).default(15),
  reason: z.string().trim().max(240).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'appointments');

    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day') ?? getIstDayString();
    const doctorId = searchParams.get('doctorId');
    const branchId = searchParams.get('branchId');
    const { start, end } = getIstDayBounds(day);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: user.clinicId,
        scheduledAt: { gte: start, lte: end },
        ...(doctorId ? { doctorId } : {}),
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            name: true,
            phone: true,
            ageYears: true,
            gender: true,
          },
        },
        doctor: {
          select: { id: true, name: true, specialty: true, consultationFee: true },
        },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ day, appointments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'appointments');

    const body = await parseJsonBody(request, createAppointmentSchema);
    const targetDoctorId = body.doctorId ?? (isDoctorRole(user.role) ? user.id : undefined);
    if (!targetDoctorId) {
      throw new ApiError(400, 'Please select a doctor.', 'DOCTOR_REQUIRED');
    }

    const scheduledAt = new Date(`${body.day}T${body.time}:00.000+05:30`);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError(400, 'Invalid date or time.', 'INVALID_DATETIME');
    }

    const [patient, doctor] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: body.patientId, clinicId: user.clinicId },
        select: { id: true, name: true },
      }),
      prisma.user.findFirst({
        where: { id: targetDoctorId, clinicId: user.clinicId, isActive: true, role: { in: ['OWNER_DOCTOR', 'DOCTOR'] } },
        select: { id: true },
      }),
    ]);

    if (!patient) throw new ApiError(404, 'Patient not found.', 'PATIENT_NOT_FOUND');
    if (!doctor) throw new ApiError(404, 'Doctor not found.', 'DOCTOR_NOT_FOUND');

    const lockKey = getSlotLockKey(doctor.id, scheduledAt);

    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Serialize concurrent booking attempts for this doctor & slot
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey}::bigint);`;

      // 2. Re-check slot conflict inside locked transaction
      const windowStart = new Date(scheduledAt.getTime() - 10 * 60 * 1000);
      const windowEnd = new Date(scheduledAt.getTime() + body.durationMinutes * 60 * 1000);
      const conflict = await tx.appointment.findFirst({
        where: {
          clinicId: user.clinicId,
          doctorId: doctor.id,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] },
          scheduledAt: { gte: windowStart, lt: windowEnd },
        },
        select: { id: true },
      });

      if (conflict) {
        throw new ApiError(
          409,
          'Doctor already has an appointment around that slot time. Pick another slot.',
          'SLOT_CONFLICT'
        );
      }

      const created = await tx.appointment.create({
        data: {
          clinicId: user.clinicId,
          branchId: body.branchId ?? user.activeBranchId ?? null,
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledAt,
          durationMinutes: body.durationMinutes,
          reason: body.reason || null,
          notes: body.notes || null,
          status: 'SCHEDULED',
        },
        include: {
          patient: {
            select: { id: true, patientCode: true, name: true, phone: true, ageYears: true, gender: true },
          },
          doctor: { select: { id: true, name: true, specialty: true, consultationFee: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          clinicId: user.clinicId,
          actorUserId: user.id,
          actorName: user.name,
          action: 'APPOINTMENT_BOOKED',
          entityType: 'Appointment',
          entityId: created.id,
          summary: `Booked slot for ${patient.name} at ${body.day} ${body.time}`,
        },
      });

      return created;
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return handleApiError(
        new ApiError(
          409,
          'Doctor already has an appointment around that slot time. Pick another slot.',
          'SLOT_CONFLICT'
        )
      );
    }
    return handleApiError(error);
  }
}
