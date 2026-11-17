import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import {
  WorkspaceHomeClient,
  type AppointmentListItem,
  type BranchOption,
  type DoctorOption,
  type PatientListItem,
  type QueueListItem,
} from '@/components/WorkspaceHomeClient';
import { requireSessionUser } from '@/lib/auth';
import { getIstDayBounds, getIstDayString, istHour } from '@/lib/date';
import { isDemoUser } from '@/lib/demo-restriction';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Today' };
export const instant = false;

async function WorkspaceHomeLoader({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const initialAction = sp.action === 'checkin' || sp.action === 'book' || sp.action === 'ocr' ? sp.action : null;
  const features = getPlanFeatures(user.clinic.planTier);
  const queueDay = getIstDayString();
  const { start, end } = getIstDayBounds(queueDay);

  const isDemo = isDemoUser(user);

  const [
    patients,
    totalPatientsCount,
    queueEntries,
    appointments,
    doctors,
    branches,
    todayVisitCount,
    dueFollowUpCount,
  ] = await Promise.all([
    prisma.patient.findMany({
      where: { clinicId: user.clinicId },
      orderBy: isDemo ? [{ patientCode: 'asc' }] : [{ updatedAt: 'desc' }],
      take: isDemo ? 2 : 10,
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
    features.queueWorkflow
      ? prisma.queueEntry.findMany({
          where: { clinicId: user.clinicId, queueDay },
          orderBy: { tokenNumber: 'asc' },
          include: {
            patient: {
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
                documents: {
                  where: { reportDate: { gte: start, lte: end } },
                  select: { id: true, title: true, docType: true },
                },
              },
            },
            doctor: {
              select: { id: true, name: true, specialty: true, consultationFee: true },
            },
            billingRecords: {
              select: { id: true, netAmount: true, paymentStatus: true, paymentMode: true },
            },
          },
        })
      : Promise.resolve([]),
    features.appointments && user.clinic.enableAppointments
      ? prisma.appointment.findMany({
          where: {
            clinicId: user.clinicId,
            scheduledAt: { gte: start, lte: end },
          },
          orderBy: { scheduledAt: 'asc' },
          include: {
            patient: {
              select: { id: true, patientCode: true, name: true, phone: true, ageYears: true, gender: true },
            },
            doctor: {
              select: { id: true, name: true, specialty: true },
            },
          },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        clinicId: user.clinicId,
        isActive: true,
        role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, specialty: true, consultationFee: true, role: true },
    }),
    features.multiBranch
      ? prisma.branch.findMany({
          where: { clinicId: user.clinicId, isActive: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          select: { id: true, name: true, code: true, isDefault: true },
        })
      : Promise.resolve([]),
    prisma.visit.count({
      where: {
        clinicId: user.clinicId,
        visitedAt: { gte: start, lte: end },
      },
    }),
    prisma.visit.count({
      where: {
        clinicId: user.clinicId,
        followUpDate: { lte: end },
        followUpStatus: { in: ['PENDING', 'REMINDED'] },
      },
    }),
  ]);

  const serializedPatients: PatientListItem[] = patients.map((p) => ({
    ...p,
    visits: p.visits.map((v) => ({
      ...v,
      visitedAt: v.visitedAt.toISOString(),
    })),
  }));

  const serializedQueue: QueueListItem[] = queueEntries.map((q) => ({
    id: q.id,
    branchId: q.branchId,
    tokenNumber: q.tokenNumber,
    status: q.status,
    notes: q.notes,
    vitals: (q.vitals as Record<string, string> | null) ?? null,
    patient: q.patient,
    doctor: q.doctor,
    billingRecords: q.billingRecords,
  }));

  const serializedAppointments: AppointmentListItem[] = appointments.map((a) => ({
    id: a.id,
    branchId: a.branchId,
    scheduledAt: a.scheduledAt.toISOString(),
    durationMinutes: a.durationMinutes,
    reason: a.reason,
    status: a.status,
    queueEntryId: a.queueEntryId,
    patient: a.patient,
    doctor: a.doctor,
  }));

  const serializedDoctors: DoctorOption[] = doctors;
  const serializedBranches: BranchOption[] = branches;

  return (
    <WorkspaceHomeClient
      user={user}
      initialPatients={serializedPatients}
      totalPatientsCount={isDemo ? Math.min(totalPatientsCount, 2) : totalPatientsCount}
      initialQueue={serializedQueue}
      initialAppointments={serializedAppointments}
      doctors={serializedDoctors}
      branches={serializedBranches}
      queueDay={queueDay}
      todayVisitCount={todayVisitCount}
      dueFollowUpCount={dueFollowUpCount}
      initialAction={initialAction}
      greetingText={istHour() < 12 ? 'Good morning' : istHour() < 17 ? 'Good afternoon' : 'Good evening'}
    />
  );
}

export default function AppHomePage(props: PageProps<'/app'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WorkspaceHomeLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
