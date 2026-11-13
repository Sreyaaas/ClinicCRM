import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PrintVisitClient, type PrintableVisitData } from '@/components/PrintVisitClient';
import { requireSessionUser } from '@/lib/auth';
import { formatIstDate, formatIstDateTime } from '@/lib/date';
import { prisma } from '@/lib/prisma';

async function PrintVisitLoader({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSessionUser();
  const { id } = await params;

  const visit = await prisma.visit.findFirst({
    where: { id, clinicId: user.clinicId },
    include: {
      doctor: { select: { name: true, specialty: true, registrationNo: true } },
      patient: {
        select: { id: true, patientCode: true, name: true, phone: true, ageYears: true, gender: true },
      },
      prescriptions: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!visit) {
    notFound();
  }

  const printable: PrintableVisitData = {
    id: visit.id,
    visitedAtText: formatIstDateTime(visit.visitedAt),
    chiefComplaint: visit.chiefComplaint,
    diagnosis: visit.diagnosis,
    clinicalNotes: visit.clinicalNotes,
    followUpDateText: visit.followUpDate ? formatIstDate(visit.followUpDate) : null,
    followUpReason: visit.followUpReason,
    vitals: (visit.vitals as Record<string, string> | null) ?? null,
    clinic: {
      name: user.clinic.name,
      phone: user.clinic.phone,
      address: user.clinic.address,
      rxFooterNote: user.clinic.rxFooterNote,
      printPaperSize: user.clinic.printPaperSize,
      rxWatermark: user.clinic.rxWatermark,
    },
    doctor: visit.doctor,
    patient: visit.patient,
    prescriptions: visit.prescriptions.map((p) => ({
      id: p.id,
      medicineName: p.medicineName,
      dosage: p.dosage,
      timing: p.timing,
      durationDays: p.durationDays,
    })),
  };

  return <PrintVisitClient data={printable} />;
}

export const metadata: Metadata = { title: 'Prescription' };

export default function PrintVisitPage(props: PageProps<'/app/visits/[id]/print'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PrintVisitLoader params={props.params} />
    </Suspense>
  );
}
