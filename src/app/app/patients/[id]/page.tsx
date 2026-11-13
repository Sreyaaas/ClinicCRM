import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import {
  PatientChartClient,
  type ChartConditionTemplate,
  type ChartPatient,
} from '@/components/PatientChartClient';
import { requireSessionUser } from '@/lib/auth';
import { getIstDayString } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

async function PatientChartLoader({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ queueId?: string; queueEntryId?: string }>;
}) {
  const user = await requireSessionUser();
  const features = getPlanFeatures(user.clinic.planTier);
  const { id } = await params;
  const sp = await searchParams;
  const activeQueueId =
    typeof sp.queueEntryId === 'string'
      ? sp.queueEntryId
      : typeof sp.queueId === 'string'
        ? sp.queueId
        : null;

  const patient = await prisma.patient.findFirst({
    where: { id, clinicId: user.clinicId },
    include: {
      visits: {
        orderBy: { visitedAt: 'desc' },
        include: {
          doctor: { select: { id: true, name: true, specialty: true } },
          prescriptions: { orderBy: { sortOrder: 'asc' } },
          documents: {
            orderBy: { reportDate: 'desc' },
            select: {
              id: true,
              docType: true,
              title: true,
              mimeType: true,
              reportDate: true,
            },
          },
        },
      },
      documents: {
        orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          uploadedBy: { select: { id: true, name: true, role: true } },
        },
      },
      billingRecords: {
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { select: { id: true, name: true } },
        },
      },
      clinicalOrders: {
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!patient) {
    notFound();
  }

  const [familyMembers, presets, templates] = await Promise.all([
    prisma.patient.findMany({
      where: {
        clinicId: user.clinicId,
        phone: patient.phone,
        id: { not: patient.id },
      },
      select: { id: true, patientCode: true, name: true, ageYears: true, gender: true },
    }),
    prisma.clinicMedicinePreset.findMany({
      where: { clinicId: user.clinicId },
      orderBy: [{ usageCount: 'desc' }, { medicineName: 'asc' }],
      take: 25,
      select: {
        id: true,
        medicineName: true,
        defaultDosage: true,
        defaultTiming: true,
        defaultDuration: true,
        instructions: true,
      },
    }),
    features.conditionTemplates
      ? prisma.conditionTemplate.findMany({
          where: { clinicId: user.clinicId },
          orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const serializedPatient: ChartPatient = {
    id: patient.id,
    patientCode: patient.patientCode,
    name: patient.name,
    phone: patient.phone,
    ageYears: patient.ageYears,
    gender: patient.gender,
    place: patient.place,
    allergies: patient.allergies,
    chronicConditions: patient.chronicConditions,
    notes: patient.notes,
    visits: patient.visits.map((v) => ({
      id: v.id,
      visitedAt: v.visitedAt.toISOString(),
      chiefComplaint: v.chiefComplaint,
      vitals: (v.vitals as Record<string, string> | null) ?? null,
      diagnosis: v.diagnosis,
      clinicalNotes: v.clinicalNotes,
      followUpDate: v.followUpDate ? v.followUpDate.toISOString() : null,
      followUpReason: v.followUpReason,
      followUpStatus: v.followUpStatus,
      doctor: v.doctor,
      prescriptions: v.prescriptions.map((p) => ({
        id: p.id,
        medicineName: p.medicineName,
        dosage: p.dosage,
        timing: p.timing,
        durationDays: p.durationDays,
        instructions: p.instructions,
      })),
      documents: v.documents.map((d) => ({
        id: d.id,
        docType: d.docType,
        title: d.title,
        mimeType: d.mimeType,
        reportDate: d.reportDate.toISOString(),
      })),
    })),
    documents: patient.documents.map((d) => ({
      id: d.id,
      visitId: d.visitId,
      docType: d.docType,
      title: d.title,
      notes: d.notes,
      reportDate: d.reportDate.toISOString(),
      storageProvider: d.storageProvider,
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      uploadedBy: d.uploadedBy,
    })),
    billingRecords: patient.billingRecords.map((b) => ({
      id: b.id,
      invoiceNumber: b.invoiceNumber,
      netAmount: b.netAmount,
      paymentStatus: b.paymentStatus,
      paymentMode: b.paymentMode,
      createdAt: b.createdAt.toISOString(),
      doctor: b.doctor,
    })),
    clinicalOrders: patient.clinicalOrders.map((o) => ({
      id: o.id,
      visitId: o.visitId,
      orderType: o.orderType,
      itemName: o.itemName,
      instructions: o.instructions,
      status: o.status,
      amount: o.amount,
      createdAt: o.createdAt.toISOString(),
      doctor: o.doctor,
    })),
  };

  const serializedTemplates: ChartConditionTemplate[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    diagnosis: t.diagnosis,
    clinicalNotes: t.clinicalNotes,
    followUpDays: t.followUpDays,
    medicines: Array.isArray(t.medicines)
      ? (t.medicines as ChartConditionTemplate['medicines'])
      : [],
  }));

  return (
    <PatientChartClient
      user={user}
      initialPatient={serializedPatient}
      familyMembers={familyMembers}
      presets={presets}
      conditionTemplates={serializedTemplates}
      activeQueueId={activeQueueId}
      todayIst={getIstDayString()}
    />
  );
}

export const metadata: Metadata = { title: 'Patient' };

export default function PatientChartPage(props: PageProps<'/app/patients/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PatientChartLoader params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
