import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { FollowUpsClient, type FollowUpItem } from '@/components/FollowUpsClient';
import { requireSessionUser } from '@/lib/auth';
import { formatIstDate, getIstDayBounds, getIstDayString } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import { buildFollowUpMessage, buildWhatsAppLink } from '@/lib/whatsapp';

async function FollowUpsLoader() {
  const user = await requireSessionUser();
  const todayStr = getIstDayString();
  const { end } = getIstDayBounds(todayStr);

  const visits = await prisma.visit.findMany({
    where: {
      clinicId: user.clinicId,
      followUpDate: { lte: end },
      followUpStatus: { in: ['PENDING', 'REMINDED'] },
    },
    orderBy: { followUpDate: 'asc' },
    take: 80,
    include: {
      patient: {
        select: { id: true, patientCode: true, name: true, phone: true, place: true },
      },
      doctor: { select: { id: true, name: true } },
    },
  });

  const initialItems: FollowUpItem[] = visits.map((v) => {
    const dateText = v.followUpDate ? formatIstDate(v.followUpDate) : '';
    return {
      id: v.id,
      followUpDate: v.followUpDate ? v.followUpDate.toISOString() : null,
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

  return <FollowUpsClient initialItems={initialItems} todayStr={todayStr} />;
}

export const metadata: Metadata = { title: 'Follow-ups' };

export default function FollowUpsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FollowUpsLoader />
    </Suspense>
  );
}
