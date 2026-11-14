import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIstDayBounds, getIstDayString } from '@/lib/date';

export async function GET() {
  const timings: Record<string, number> = {};
  
  // 1. Session user query
  let t0 = Date.now();
  const user = await prisma.user.findFirst({
    where: { email: 'dr.arun@solo.in' },
    select: {
      id: true,
      clinicId: true,
      clinic: { select: { planTier: true } }
    }
  });
  timings['user_findFirst'] = Date.now() - t0;
  
  if (!user) {
    return NextResponse.json({ error: 'User not found', timings });
  }

  const queueDay = getIstDayString();
  const { start, end } = getIstDayBounds(queueDay);

  // 2. Patients findMany
  t0 = Date.now();
  await prisma.patient.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      patientCode: true,
      name: true,
      phone: true,
      _count: { select: { visits: true, documents: true } },
      visits: {
        orderBy: { visitedAt: 'desc' },
        take: 1,
        select: { visitedAt: true, diagnosis: true },
      },
    },
  });
  timings['patients_findMany'] = Date.now() - t0;

  // 3. Patients count
  t0 = Date.now();
  await prisma.patient.count({ where: { clinicId: user.clinicId } });
  timings['patients_count'] = Date.now() - t0;

  // 4. Appointments findMany
  t0 = Date.now();
  await prisma.appointment.findMany({
    where: {
      clinicId: user.clinicId,
      scheduledAt: { gte: start, lte: end },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      patient: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true } },
    },
  });
  timings['appointments_findMany'] = Date.now() - t0;

  // 5. Doctors findMany
  t0 = Date.now();
  await prisma.user.findMany({
    where: {
      clinicId: user.clinicId,
      isActive: true,
      role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
    },
    select: { id: true, name: true },
  });
  timings['doctors_findMany'] = Date.now() - t0;

  // 6. Today visits count
  t0 = Date.now();
  await prisma.visit.count({
    where: {
      clinicId: user.clinicId,
      visitedAt: { gte: start, lte: end },
    },
  });
  timings['today_visits_count'] = Date.now() - t0;

  // 7. Followup count
  t0 = Date.now();
  await prisma.visit.count({
    where: {
      clinicId: user.clinicId,
      followUpDate: { lte: end },
      followUpStatus: { in: ['PENDING', 'REMINDED'] },
    },
  });
  timings['followups_count'] = Date.now() - t0;

  return NextResponse.json({ ok: true, timings });
}
