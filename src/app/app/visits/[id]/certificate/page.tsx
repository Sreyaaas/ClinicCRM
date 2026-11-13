import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { FeatureLockedCard } from '@/components/PlanBadge';
import { PrintCertificateClient } from '@/components/PrintCertificateClient';
import { requireSessionUser } from '@/lib/auth';
import { formatIstDate } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

async function CertificateLoader({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  const features = getPlanFeatures(user.clinic.planTier);

  if (!features.certificatesPrint) {
    return (
      <FeatureLockedCard
        feature="certificatesPrint"
        currentTier={user.clinic.planTier}
        title="Printable Medical Fitness, Leave & Referral Certificates"
        description="Generate 1-tap letterhead medical fitness, sick leave, and specialist referral letters directly from any patient visit."
      />
    );
  }

  const { id } = await params;
  const visit = await prisma.visit.findFirst({
    where: { id, clinicId: user.clinicId },
    include: {
      clinic: true,
      doctor: { select: { name: true, specialty: true, registrationNo: true } },
      patient: true,
    },
  });

  if (!visit) notFound();

  return (
    <PrintCertificateClient
      data={{
        clinicName: visit.clinic.name,
        clinicAddress: visit.clinic.address,
        clinicPhone: visit.clinic.phone,
        doctorName: visit.doctor.name,
        doctorSpecialty: visit.doctor.specialty,
        doctorRegNo: visit.doctor.registrationNo,
        patientId: visit.patient.id,
        patientName: visit.patient.name,
        patientCode: visit.patient.patientCode,
        patientAge: visit.patient.ageYears,
        patientGender: visit.patient.gender,
        visitedAtText: formatIstDate(visit.visitedAt),
        diagnosis: visit.diagnosis,
      }}
    />
  );
}

export const metadata: Metadata = { title: 'Certificate' };

export default function VisitCertificatePage(props: PageProps<'/app/visits/[id]/certificate'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CertificateLoader params={props.params} />
    </Suspense>
  );
}
