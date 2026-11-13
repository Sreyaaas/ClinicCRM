import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { FeatureLockedCard } from '@/components/PlanBadge';
import { QueueBoardClient } from '@/components/QueueBoardClient';
import { requireSessionUser } from '@/lib/auth';
import { getIstDayString } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

async function QueueBoardLoader() {
  const user = await requireSessionUser();
  const features = getPlanFeatures(user.clinic.planTier);

  if (!features.waitingRoomBoard) {
    return (
      <FeatureLockedCard
        feature="waitingRoomBoard"
        currentTier={user.clinic.planTier}
        title="Waiting-Room Live TV Token Display"
        description="Display Now Serving and Up Next patient tokens across consulting doctors on a reception monitor or tablet."
      />
    );
  }

  const queueDay = getIstDayString();
  const entries = await prisma.queueEntry.findMany({
    where: { clinicId: user.clinicId, queueDay },
    orderBy: [{ tokenNumber: 'asc' }],
    include: {
      patient: { select: { name: true } },
      doctor: { select: { id: true, name: true, specialty: true } },
    },
  });

  return (
    <QueueBoardClient
      clinicName={user.clinic.name}
      queueDay={queueDay}
      initialEntries={entries.map((q) => ({
        id: q.id,
        tokenNumber: q.tokenNumber,
        status: q.status,
        patientName: q.patient.name,
        doctorId: q.doctor.id,
        doctorName: q.doctor.name,
        specialty: q.doctor.specialty,
      }))}
    />
  );
}

export const metadata: Metadata = { title: 'Waiting room' };

export default function QueueBoardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QueueBoardLoader />
    </Suspense>
  );
}
