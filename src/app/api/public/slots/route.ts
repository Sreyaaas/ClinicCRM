import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api';
import { getIstHhmm } from '@/lib/date';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicSlug = searchParams.get('clinicSlug')?.trim();
    const doctorId = searchParams.get('doctorId')?.trim();
    const day = searchParams.get('day')?.trim(); // YYYY-MM-DD

    if (!clinicSlug || !doctorId || !day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return NextResponse.json({ bookedTimes: [] });
    }

    // Verify doctor strictly belongs to the specified clinic to prevent cross-clinic probing
    const doctor = await prisma.user.findFirst({
      where: {
        id: doctorId,
        clinic: { slug: clinicSlug },
        isActive: true,
        role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
      },
      select: { id: true },
    });
    if (!doctor) {
      return NextResponse.json({ bookedTimes: [], day, doctorId });
    }

    const dayStart = new Date(`${day}T00:00:00.000+05:30`);
    const dayEnd = new Date(`${day}T23:59:59.999+05:30`);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinic: { slug: clinicSlug },
        doctorId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'] },
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
      select: { scheduledAt: true },
    });

    const bookedTimes = appointments.map((a) => getIstHhmm(a.scheduledAt));

    return NextResponse.json({ bookedTimes, day, doctorId });
  } catch (error) {
    return handleApiError(error);
  }
}
