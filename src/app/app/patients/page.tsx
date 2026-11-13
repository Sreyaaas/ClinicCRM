import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PatientsClient } from '@/components/PatientsClient';
import type { PatientListItem } from '@/components/patients';
import { requireSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Patients' };

async function PatientsLoader() {
  const user = await requireSessionUser();
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { updatedAt: 'desc' },
      take: 40,
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
        _count: { select: { visits: true, documents: true } },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 1,
          select: { visitedAt: true, diagnosis: true, chiefComplaint: true },
        },
      },
    }),
    prisma.patient.count({ where: { clinicId: user.clinicId } }),
  ]);

  const serialized: PatientListItem[] = patients.map((p) => ({
    ...p,
    visits: p.visits.map((v) => ({ ...v, visitedAt: v.visitedAt.toISOString() })),
  }));

  return <PatientsClient initialPatients={serialized} totalCount={total} maxPatients={user.clinic.maxPatients} />;
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PatientsLoader />
    </Suspense>
  );
}
