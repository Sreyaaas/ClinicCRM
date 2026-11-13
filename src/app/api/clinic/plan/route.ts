import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { PLAN_DEFAULTS, TRIAL_MS } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const switchPlanSchema = z.object({
  planTier: z.enum(['SOLO', 'CLINIC', 'GROWTH', 'ENTERPRISE']),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const [patientCount, storageAgg, activeDoctors, activeStaff, branchCount] = await Promise.all([
      prisma.patient.count({ where: { clinicId: user.clinicId } }),
      prisma.patientDocument.aggregate({
        where: { clinicId: user.clinicId },
        _sum: { sizeBytes: true },
      }),
      prisma.user.count({
        where: {
          clinicId: user.clinicId,
          isActive: true,
          role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
        },
      }),
      prisma.user.count({
        where: { clinicId: user.clinicId, isActive: true, role: 'STAFF' },
      }),
      prisma.branch.count({ where: { clinicId: user.clinicId, isActive: true } }),
    ]);

    return NextResponse.json({
      planTier: user.clinic.planTier,
      usage: {
        patients: patientCount,
        maxPatients: user.clinic.maxPatients,
        storageMb: Math.round(((storageAgg._sum.sizeBytes ?? 0) / (1024 * 1024)) * 10) / 10,
        maxStorageMb: user.clinic.maxStorageMb,
        doctors: activeDoctors,
        maxDoctors: user.clinic.maxDoctors,
        staff: activeStaff,
        maxStaff: user.clinic.maxStaff,
        branches: branchCount,
        maxBranches: user.clinic.maxBranches,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR'],
    });
    if (process.env.NEXT_PUBLIC_ENABLE_DEMO_USERS === 'false' && process.env.ALLOW_PILOT_PLAN_SWITCH !== 'true') {
      throw new ApiError(
        403,
        'Self-serve pilot plan switching is disabled in live production billing mode.',
        'PILOT_SWITCH_DISABLED'
      );
    }

    const body = await parseJsonBody(request, switchPlanSchema);
    const nextPlan = PLAN_DEFAULTS[body.planTier];

    const updatedClinic = await prisma.clinic.update({
      where: { id: user.clinicId },
      data: {
        planTier: body.planTier,
        maxDoctors: nextPlan.maxDoctors,
        maxStaff: nextPlan.maxStaff,
        maxPatients: nextPlan.maxPatients,
        maxStorageMb: nextPlan.maxStorageMb,
        maxBranches: nextPlan.maxBranches,
        enableBilling: nextPlan.features.billing,
        enableAppointments: nextPlan.features.appointments,
        enablePublicBooking: nextPlan.features.publicBooking,
        enableOrders: nextPlan.features.labAndPharmacy ? user.clinic.enableOrders || true : false,
        ...(!nextPlan.features.clinicThemes ? { themePreset: 'teal' } : {}),
        ...(!nextPlan.features.nightAndLayoutCustomization
          ? { colorMode: 'light', uiDensity: 'comfortable', cardRadius: 'rounded' }
          : {}),
        ...(!nextPlan.features.whiteLabelBranding
          ? { sidebarTone: 'light', hidePoweredBy: false, rxWatermark: null }
          : {}),
        ...(!nextPlan.features.customPrintSizes ? { printPaperSize: 'A4' } : {}),
        // Switching plans must not restart the trial or downgrade a paid clinic back to trial
        ...(user.clinic.subscriptionStatus === 'TRIAL' && !user.clinic.trialEndsAt
          ? { trialEndsAt: new Date(Date.now() + TRIAL_MS) }
          : {}),
      },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'PLAN_TIER_CHANGED',
      entityType: 'Clinic',
      entityId: updatedClinic.id,
      summary: `Switched clinic plan from ${user.clinic.planTier} to ${body.planTier} (${nextPlan.label})`,
    });

    return NextResponse.json({ clinic: updatedClinic, plan: nextPlan });
  } catch (error) {
    return handleApiError(error);
  }
}
