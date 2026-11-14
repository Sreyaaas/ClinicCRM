import type { PlanTier, SubscriptionStatus, UserRole } from '@prisma/client';

export type PlanFeatureKey =
  | 'appointments'
  | 'publicBooking'
  | 'billing'
  | 'upiQr'
  | 'conditionTemplates'
  | 'certificatesPrint'
  | 'allergySafety'
  | 'customPrintSizes'
  | 'queueWorkflow'
  | 'teamManagement'
  | 'waitingRoomBoard'
  | 'multiDoctorBilling'
  | 'expensesTracker'
  | 'clinicThemes'
  | 'itemizedGstBilling'
  | 'analyticsMis'
  | 'labAndPharmacy'
  | 'auditLogs'
  | 'nightAndLayoutCustomization'
  | 'multiBranch'
  | 'whiteLabelBranding';

export interface PlanDefaults {
  tier: PlanTier;
  label: string;
  shortName: string;
  badge: string;
  tagline: string;
  targetAudience: string;
  monthlyPriceInr: number;
  maxDoctors: number;
  maxStaff: number;
  maxPatients: number | null;
  maxStorageMb: number;
  maxBranches: number;
  recommended?: boolean;
  features: Record<PlanFeatureKey, boolean>;
  highlights: string[];
}

/** Plans offered to clinics. STARTER is a retired free tier kept only for existing accounts. */
export const PLAN_ORDER: PlanTier[] = ['SOLO', 'CLINIC', 'GROWTH', 'ENTERPRISE'];

/** Free trial length for every new clinic. */
export const TRIAL_DAYS = 14;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export const PLAN_DEFAULTS: Record<PlanTier, PlanDefaults> = {
  STARTER: {
    tier: 'STARTER',
    label: 'Starter (retired)',
    shortName: 'Starter',
    badge: 'Free',
    tagline: 'Simple patient file & photo storage on your phone',
    targetAudience: 'Evening clinics & individual doctors testing paperless files',
    monthlyPriceInr: 0,
    maxDoctors: 1,
    maxStaff: 0,
    maxPatients: 100,
    maxStorageMb: 1024,
    maxBranches: 1,
    features: {
      appointments: false,
      publicBooking: false,
      billing: false,
      upiQr: false,
      conditionTemplates: false,
      certificatesPrint: false,
      allergySafety: false,
      customPrintSizes: true,
      queueWorkflow: false,
      teamManagement: false,
      waitingRoomBoard: false,
      multiDoctorBilling: false,
      expensesTracker: false,
      clinicThemes: true,
      itemizedGstBilling: false,
      analyticsMis: false,
      labAndPharmacy: false,
      auditLogs: false,
      nightAndLayoutCustomization: true,
      multiBranch: false,
      whiteLabelBranding: false,
    },
    highlights: [
      '1 Doctor · Up to 100 Patients · 1 GB cloud storage',
      'Find any patient in 2 seconds by phone or name',
      'Camera photo scan for paper slips & blood reports',
      'Rx print (A4/A5/Thermal), Dark Mode & WhatsApp links',
    ],
  },
  SOLO: {
    tier: 'SOLO',
    label: 'Solo Pro',
    shortName: 'Solo Pro',
    badge: 'For 1 Doctor',
    tagline: 'Everything one busy doctor needs on mobile & laptop',
    targetAudience: 'Independent doctors & specialists without front-desk staff',
    monthlyPriceInr: 299,
    maxDoctors: 1,
    maxStaff: 0,
    maxPatients: null,
    maxStorageMb: 10240,
    maxBranches: 1,
    features: {
      appointments: true,
      publicBooking: true,
      billing: true,
      upiQr: true,
      conditionTemplates: true,
      certificatesPrint: true,
      allergySafety: true,
      customPrintSizes: true,
      queueWorkflow: false,
      teamManagement: false,
      waitingRoomBoard: false,
      multiDoctorBilling: false,
      expensesTracker: false,
      clinicThemes: true,
      itemizedGstBilling: false,
      analyticsMis: false,
      labAndPharmacy: false,
      auditLogs: false,
      nightAndLayoutCustomization: true,
      multiBranch: false,
      whiteLabelBranding: false,
    },
    highlights: [
      'Unlimited patients & 10 GB private cloud photo storage',
      'Quick Illness Packs + Instant Drug & Allergy Warnings',
      'Online Patient Booking Link (/book/clinic) + Slot Calendar',
      'Fees & UPI QR + A4, A5 & 80mm Thermal Print + All Themes',
    ],
  },
  CLINIC: {
    tier: 'CLINIC',
    label: 'Clinic Core',
    shortName: 'Clinic Core',
    badge: 'Most Popular',
    tagline: 'Front desk, live token queue, expenses & multi-doctor OPD',
    targetAudience: 'Polyclinics & group practices up to 5 doctors',
    monthlyPriceInr: 699,
    maxDoctors: 5,
    maxStaff: 5,
    maxPatients: null,
    maxStorageMb: 51200,
    maxBranches: 1,
    recommended: true,
    features: {
      appointments: true,
      publicBooking: true,
      billing: true,
      upiQr: true,
      conditionTemplates: true,
      certificatesPrint: true,
      allergySafety: true,
      customPrintSizes: true,
      queueWorkflow: true,
      teamManagement: true,
      waitingRoomBoard: true,
      multiDoctorBilling: true,
      expensesTracker: true,
      clinicThemes: true,
      itemizedGstBilling: false,
      analyticsMis: false,
      labAndPharmacy: false,
      auditLogs: false,
      nightAndLayoutCustomization: true,
      multiBranch: false,
      whiteLabelBranding: false,
    },
    highlights: [
      'Up to 5 Doctors + 5 Reception/Nurse Staff logins (50 GB)',
      'Live Walk-In Token Queue + Waiting-Room TV Screen',
      'Multi-Doctor OPD consultation fee collection & splitting',
      'Daily Clinic Expense Log & Net Cash in Hand tally',
    ],
  },
  GROWTH: {
    tier: 'GROWTH',
    label: 'Clinic Growth',
    shortName: 'Growth',
    badge: 'Full Clinic',
    tagline: 'GST bills, profit MIS reports, lab/medical store & staff audit trail',
    targetAudience: 'Diagnostic centers & multi-specialty clinics',
    monthlyPriceInr: 1299,
    maxDoctors: 15,
    maxStaff: 15,
    maxPatients: null,
    maxStorageMb: 204800,
    maxBranches: 1,
    features: {
      appointments: true,
      publicBooking: true,
      billing: true,
      upiQr: true,
      conditionTemplates: true,
      certificatesPrint: true,
      allergySafety: true,
      customPrintSizes: true,
      queueWorkflow: true,
      teamManagement: true,
      waitingRoomBoard: true,
      multiDoctorBilling: true,
      expensesTracker: true,
      clinicThemes: true,
      itemizedGstBilling: true,
      analyticsMis: true,
      labAndPharmacy: true,
      auditLogs: true,
      nightAndLayoutCustomization: true,
      multiBranch: false,
      whiteLabelBranding: false,
    },
    highlights: [
      '15 Doctors + 15 Staff seats & 200 GB storage archive',
      'Multi-item GST Invoices, Profit Reports & CA CSV download',
      'Lab Tests & Medical Store Order tracker',
      'Complete Staff Activity Audit Log for compliance & accountability',
    ],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    label: 'Enterprise Network',
    shortName: 'Enterprise',
    badge: 'Hospital / Group',
    tagline: 'Multiple branches, white-label branding & enterprise control',
    targetAudience: 'Hospital chains, multi-branch groups & branded networks',
    monthlyPriceInr: 2499,
    maxDoctors: 999,
    maxStaff: 999,
    maxPatients: null,
    maxStorageMb: 1048576,
    maxBranches: 10,
    features: {
      appointments: true,
      publicBooking: true,
      billing: true,
      upiQr: true,
      conditionTemplates: true,
      certificatesPrint: true,
      allergySafety: true,
      customPrintSizes: true,
      queueWorkflow: true,
      teamManagement: true,
      waitingRoomBoard: true,
      multiDoctorBilling: true,
      expensesTracker: true,
      clinicThemes: true,
      itemizedGstBilling: true,
      analyticsMis: true,
      labAndPharmacy: true,
      auditLogs: true,
      nightAndLayoutCustomization: true,
      multiBranch: true,
      whiteLabelBranding: true,
    },
    highlights: [
      'Unlimited Doctors & Staff across up to 10 Clinic Branches (1 TB)',
      'Custom watermark on Rx & Bills + hide platform footer branding',
      'Pick any custom hex brand color + Dark navigation sidebar',
      'Full multi-branch switching & centralized admin controls',
    ],
  },
};

export function isDoctorRole(role: UserRole): boolean {
  return role === 'OWNER_DOCTOR' || role === 'DOCTOR';
}

export function isSubscriptionActive(
  status: SubscriptionStatus,
  trialEndsAt?: Date | string | null
): boolean {
  if (status === 'ACTIVE') return true;
  if (status === 'TRIAL') {
    if (!trialEndsAt) return true;
    const expiry = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt;
    return Number.isNaN(expiry.getTime()) ? true : expiry.getTime() > Date.now();
  }
  return false;
}

/** Yearly billing = 10 × monthly (two months free). */
export function yearlyPriceInr(tier: PlanTier): number {
  return (PLAN_DEFAULTS[tier]?.monthlyPriceInr ?? 0) * 10;
}

export function getPlanFeatures(planTier: PlanTier): Record<PlanFeatureKey, boolean> {
  return PLAN_DEFAULTS[planTier]?.features ?? PLAN_DEFAULTS.SOLO.features;
}

export function getPlanDefinition(planTier: PlanTier): PlanDefaults {
  return PLAN_DEFAULTS[planTier] ?? PLAN_DEFAULTS.SOLO;
}

export function getTierRequiredForFeature(feature: PlanFeatureKey): PlanDefaults {
  for (const tier of PLAN_ORDER) {
    if (PLAN_DEFAULTS[tier].features[feature]) {
      return PLAN_DEFAULTS[tier];
    }
  }
  return PLAN_DEFAULTS.ENTERPRISE;
}

export function formatStorageMb(mb: number): string {
  if (mb >= 1024 * 1024) return `${(mb / (1024 * 1024)).toFixed(0)} TB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}
