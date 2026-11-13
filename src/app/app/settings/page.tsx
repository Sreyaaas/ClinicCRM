import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import {
  SettingsClient,
  type SettingsAuditItem,
  type SettingsBranchItem,
  type SettingsMemberItem,
  type SettingsPresetItem,
  type SettingsTabId,
  type SettingsTemplateItem,
} from '@/components/SettingsClient';
import { requireSessionUser } from '@/lib/auth';
import { getPlanFeatures, isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { getInfrastructureStatus } from '@/lib/supabase';

async function SettingsLoader({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const features = getPlanFeatures(user.clinic.planTier);
  const validTabs: SettingsTabId[] = ['profile', 'clinic', 'appearance', 'presets', 'team', 'plan', 'security'];
  const requested = sp.tab === 'themes' ? 'appearance' : sp.tab;
  const initialTab: SettingsTabId =
    typeof requested === 'string' && validTabs.includes(requested as SettingsTabId)
      ? (requested as SettingsTabId)
      : user.role === 'OWNER_DOCTOR'
        ? 'clinic'
        : 'profile';

  const [members, presets, templates, branches, auditLogs, patientCount, storageAgg] =
    await Promise.all([
      prisma.user.findMany({
        where: { clinicId: user.clinicId },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          specialty: true,
          registrationNo: true,
          consultationFee: true,
          isActive: true,
        },
      }),
      prisma.clinicMedicinePreset.findMany({
        where: { clinicId: user.clinicId },
        orderBy: [{ usageCount: 'desc' }, { medicineName: 'asc' }],
        select: {
          id: true,
          medicineName: true,
          defaultDosage: true,
          defaultTiming: true,
          defaultDuration: true,
        },
      }),
      features.conditionTemplates
        ? prisma.conditionTemplate.findMany({
            where: { clinicId: user.clinicId },
            orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
          })
        : Promise.resolve([]),
      features.multiBranch
        ? prisma.branch.findMany({
            where: { clinicId: user.clinicId, isActive: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
          })
        : Promise.resolve([]),
      features.auditLogs && isDoctorRole(user.role)
        ? prisma.auditLog.findMany({
            where: { clinicId: user.clinicId },
            orderBy: { createdAt: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),
      prisma.patient.count({ where: { clinicId: user.clinicId } }),
      prisma.patientDocument.aggregate({
        where: { clinicId: user.clinicId },
        _sum: { sizeBytes: true },
      }),
    ]);

  const serializedTemplates: SettingsTemplateItem[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    diagnosis: t.diagnosis,
    clinicalNotes: t.clinicalNotes,
    followUpDays: t.followUpDays,
    medicinesCount: Array.isArray(t.medicines) ? t.medicines.length : 0,
  }));

  const serializedBranches: SettingsBranchItem[] = branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    phone: b.phone,
    address: b.address,
    isDefault: b.isDefault,
  }));

  const serializedAudit: SettingsAuditItem[] = auditLogs.map((a) => ({
    id: a.id,
    actorName: a.actorName,
    action: a.action,
    entityType: a.entityType,
    summary: a.summary,
    createdAt: a.createdAt.toISOString(),
  }));

  const serializedMembers: SettingsMemberItem[] = members;
  const serializedPresets: SettingsPresetItem[] = presets;
  const storageUsedMb =
    Math.round((((storageAgg._sum.sizeBytes ?? 0) / (1024 * 1024)) + Number.EPSILON) * 100) /
    100;

  return (
    <SettingsClient
      user={user}
      initialTab={initialTab}
      initialMembers={serializedMembers}
      initialPresets={serializedPresets}
      initialTemplates={serializedTemplates}
      initialBranches={serializedBranches}
      initialAudit={serializedAudit}
      usage={{
        patients: patientCount,
        storageMb: storageUsedMb,
      }}
      infra={getInfrastructureStatus()}
    />
  );
}

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage(props: PageProps<'/app/settings'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
