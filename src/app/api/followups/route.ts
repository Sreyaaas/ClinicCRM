import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/lib/api';
import { formatIstDate, getIstDayBounds, getIstDayString } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import { buildFollowUpMessage, buildWhatsAppLink } from '@/lib/whatsapp';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') ?? 'due';
    const todayStr = getIstDayString();
    const { start: todayStart, end: todayEnd } = getIstDayBounds(todayStr);

    let followUpDateFilter: object = { not: null };
    if (filter === 'today') {
      followUpDateFilter = { gte: todayStart, lte: todayEnd };
    } else if (filter === 'overdue') {
      followUpDateFilter = { lt: todayStart };
    } else if (filter === 'due') {
      followUpDateFilter = { lte: todayEnd };
    } else if (filter === 'upcoming') {
      followUpDateFilter = { gt: todayEnd };
    }

    const visits = await prisma.visit.findMany({
      where: {
        clinicId: user.clinicId,
        followUpDate: followUpDateFilter,
        ...(filter !== 'all' ? { followUpStatus: { in: ['PENDING', 'REMINDED'] } } : {}),
      },
      orderBy: [{ followUpDate: 'asc' }],
      take: 80,
      include: {
        patient: {
          select: { id: true, patientCode: true, name: true, phone: true, place: true },
        },
        doctor: {
          select: { id: true, name: true },
        },
      },
    });

    const items = visits.map((v) => {
      const dateText = v.followUpDate ? formatIstDate(v.followUpDate) : '';
      return {
        id: v.id,
        followUpDate: v.followUpDate,
        followUpDateText: dateText,
        followUpReason: v.followUpReason,
        followUpStatus: v.followUpStatus,
        diagnosis: v.diagnosis,
        patient: v.patient,
        doctor: v.doctor,
        whatsappEn: buildWhatsAppLink(
          v.patient.phone,
          buildFollowUpMessage({
            patientName: v.patient.name,
            clinicName: user.clinic.name,
            doctorName: v.doctor.name,
            followUpDateText: dateText,
            reason: v.followUpReason,
            lang: 'en',
          })
        ),
        whatsappMl: buildWhatsAppLink(
          v.patient.phone,
          buildFollowUpMessage({
            patientName: v.patient.name,
            clinicName: user.clinic.name,
            doctorName: v.doctor.name,
            followUpDateText: dateText,
            reason: v.followUpReason,
            lang: 'ml',
          })
        ),
      };
    });

    return NextResponse.json({ today: todayStr, items });
  } catch (error) {
    return handleApiError(error);
  }
}
