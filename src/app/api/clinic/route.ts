import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { canUseThemePreset } from '@/lib/themes';

const updateClinicSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  upiId: z.string().trim().max(100).nullable().optional(),
  gstin: z.string().trim().max(25).nullable().optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  themePreset: z.enum(['teal', 'blue', 'emerald', 'indigo', 'rose', 'slate', 'custom']).optional(),
  colorMode: z.enum(['light', 'dark', 'system']).optional(),
  uiDensity: z.enum(['comfortable', 'compact']).optional(),
  cardRadius: z.enum(['rounded', 'soft', 'sharp']).optional(),
  sidebarTone: z.enum(['light', 'dark']).optional(),
  printPaperSize: z.enum(['A4', 'A5', 'THERMAL']).optional(),
  rxFooterNote: z.string().trim().max(300).nullable().optional(),
  rxWatermark: z.string().trim().max(60).nullable().optional(),
  hidePoweredBy: z.boolean().optional(),
  whatsappLang: z.enum(['en', 'ml']).optional(),
  workingHours: z.string().trim().max(120).optional(),
  slotDurationMin: z.number().int().min(5).max(60).optional(),
  enablePublicBooking: z.boolean().optional(),
  enableBilling: z.boolean().optional(),
  enableFollowUps: z.boolean().optional(),
  enableVitals: z.boolean().optional(),
  enableAppointments: z.boolean().optional(),
  enableOrders: z.boolean().optional(),
  billingTiming: z.enum(['PRE_CONSULT', 'POST_CONSULT', 'FLEXIBLE']).optional(),
  defaultConsultFee: z.number().int().min(0).max(50000).optional(),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const clinic = await prisma.clinic.findUnique({
      where: { id: user.clinicId },
    });
    return NextResponse.json({ clinic });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR'],
      requireActiveSub: true,
    });
    const body = await parseJsonBody(request, updateClinicSchema);
    const features = getPlanFeatures(user.clinic.planTier);

    if (body.themePreset && !canUseThemePreset(user.clinic.planTier, body.themePreset)) {
      throw new ApiError(
        403,
        'This app theme requires a higher plan tier. Open Settings -> Plans & Pricing to switch.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    if (body.brandColor && !features.whiteLabelBranding && body.brandColor !== user.clinic.brandColor) {
      throw new ApiError(
        403,
        'Custom brand hex colors require the Enterprise plan.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    if (
      (body.colorMode !== undefined && body.colorMode !== 'light') ||
      (body.uiDensity !== undefined && body.uiDensity !== 'comfortable') ||
      (body.cardRadius !== undefined && body.cardRadius !== 'rounded')
    ) {
      if (!features.nightAndLayoutCustomization) {
        throw new ApiError(
          403,
          'Night mode, compact layout, and card style options require Clinic Growth or Enterprise.',
          'PLAN_UPGRADE_REQUIRED'
        );
      }
    }

    if (
      (body.sidebarTone === 'dark' || body.rxWatermark || body.hidePoweredBy === true) &&
      !features.whiteLabelBranding
    ) {
      throw new ApiError(
        403,
        'Dark sidebar, custom watermark, and hiding platform branding require Enterprise.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    if (body.printPaperSize && body.printPaperSize !== 'A4' && !features.customPrintSizes) {
      throw new ApiError(
        403,
        'A5 half-slip and 80mm thermal printing require Solo Pro or higher.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    if (body.gstin !== undefined && body.gstin && !features.itemizedGstBilling) {
      throw new ApiError(
        403,
        'GSTIN tax bill settings require Clinic Growth or Enterprise.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    if (body.enableOrders === true && !features.labAndPharmacy) {
      throw new ApiError(
        403,
        'Lab & Medical Store orders require Clinic Growth or Enterprise.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    const clinic = await prisma.clinic.update({
      where: { id: user.clinicId },
      data: body,
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'CLINIC_SETTINGS_UPDATED',
      entityType: 'Clinic',
      entityId: clinic.id,
      summary: 'Updated clinic look, booking hours, or active tools.',
    });

    return NextResponse.json({ clinic });
  } catch (error) {
    return handleApiError(error);
  }
}
