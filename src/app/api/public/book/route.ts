import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody } from '@/lib/api';
import { generateNextPatientCode } from '@/lib/patient-code';
import { getPlanFeatures, isSubscriptionActive } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const publicBookSchema = z.object({
  clinicSlug: z.string().trim().min(2).max(100),
  doctorId: z.string().uuid(),
  patientName: z.string().trim().min(2, 'Please enter your name').max(120),
  phone: z.string().trim().min(8, 'Please enter a valid phone number').max(20),
  ageYears: z.number().int().min(0).max(120).nullable().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().trim().max(240).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request, publicBookSchema);

    const clinic = await prisma.clinic.findUnique({
      where: { slug: body.clinicSlug },
      select: {
        id: true,
        name: true,
        planTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        enablePublicBooking: true,
        maxPatients: true,
        slotDurationMin: true,
      },
    });

    if (!clinic || !isSubscriptionActive(clinic.subscriptionStatus, clinic.trialEndsAt)) {
      throw new ApiError(404, 'Clinic online booking is currently unavailable.', 'BOOKING_UNAVAILABLE');
    }

    const features = getPlanFeatures(clinic.planTier);
    if (!features.publicBooking || !clinic.enablePublicBooking) {
      throw new ApiError(403, 'Online self-booking is not enabled for this clinic.', 'BOOKING_DISABLED');
    }

    const doctor = await prisma.user.findFirst({
      where: {
        id: body.doctorId,
        clinicId: clinic.id,
        isActive: true,
        role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
      },
      select: { id: true, name: true },
    });
    if (!doctor) throw new ApiError(404, 'Selected doctor is not available.', 'DOCTOR_NOT_FOUND');

    const scheduledAt = new Date(`${body.day}T${body.time}:00.000+05:30`);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new ApiError(400, 'Invalid date or time slot.', 'INVALID_DATETIME');
    }

    const slotConflict = await prisma.appointment.findFirst({
      where: {
        clinicId: clinic.id,
        doctorId: doctor.id,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] },
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - 10 * 60 * 1000),
          lt: new Date(scheduledAt.getTime() + clinic.slotDurationMin * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (slotConflict) {
      throw new ApiError(409, 'That slot is already taken. Please pick another time.', 'SLOT_TAKEN');
    }

    const appointment = await prisma.$transaction(async (tx) => {
      let patient = await tx.patient.findFirst({
        where: {
          clinicId: clinic.id,
          phone: body.phone,
          name: { equals: body.patientName, mode: 'insensitive' },
        },
        select: { id: true, patientCode: true, name: true },
      });

      if (!patient) {
        if (clinic.maxPatients !== null) {
          const count = await tx.patient.count({ where: { clinicId: clinic.id } });
          if (count >= clinic.maxPatients) {
            throw new ApiError(403, 'Clinic patient registration limit reached.', 'LIMIT_REACHED');
          }
        }
        const patientCode = await generateNextPatientCode(tx, clinic.id);
        patient = await tx.patient.create({
          data: {
            clinicId: clinic.id,
            patientCode,
            name: body.patientName,
            phone: body.phone,
            ageYears: body.ageYears ?? null,
          },
          select: { id: true, patientCode: true, name: true },
        });
      }

      const appt = await tx.appointment.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledAt,
          durationMinutes: clinic.slotDurationMin,
          reason: body.reason || 'Online self-booking',
          status: 'SCHEDULED',
        },
      });

      await tx.auditLog.create({
        data: {
          clinicId: clinic.id,
          actorName: patient.name,
          action: 'PUBLIC_BOOKING',
          entityType: 'Appointment',
          entityId: appt.id,
          summary: `Online booking by ${patient.name} for ${doctor.name} at ${body.day} ${body.time}`,
        },
      });

      return { id: appt.id, scheduledAt: appt.scheduledAt, patientCode: patient.patientCode, doctorName: doctor.name };
    });

    return NextResponse.json({ booking: appointment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
