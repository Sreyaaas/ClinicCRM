import { prisma } from './prisma';
import type { SessionUser } from './auth';

export class DemoRestrictionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.name = 'DemoRestrictionError';
    this.status = status;
    this.code = code;
  }
}

export const DEMO_EMAILS = [
  'dr.arun@solo.in',
  'owner@malabarclinic.in',
  'staff@malabarclinic.in',
  'growth@keralacare.in',
  'enterprise@keralacare.in',
];

export const DEMO_CLINIC_SLUGS = [
  'starter-evening',
  'dr-arun-solo',
  'malabar-polyclinic',
  'kerala-growth-center',
  'malabar-enterprise-group',
];

/**
 * Checks whether the user or clinic is a shared demo walkthrough account.
 */
export function isDemoUser(user: { email: string; clinic?: { slug?: string } | null }): boolean {
  if (DEMO_EMAILS.includes(user.email.toLowerCase())) return true;
  if (user.clinic?.slug && DEMO_CLINIC_SLUGS.includes(user.clinic.slug.toLowerCase())) return true;
  return false;
}

export function isDemoClinicSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return DEMO_CLINIC_SLUGS.includes(slug.toLowerCase());
}

/**
 * Enforces that demo clinics can use at most 1 live Gemini AI Prescription Scan.
 * After 1 live scan is performed, further requests are blocked to protect API quotas.
 */
export async function assertDemoAiQuota(user: SessionUser): Promise<void> {
  if (!isDemoUser(user)) return;

  const scansCount = await prisma.auditLog.count({
    where: {
      clinicId: user.clinicId,
      action: 'AI_OCR_SCAN',
    },
  });

  if (scansCount >= 1) {
    throw new DemoRestrictionError(
      403,
      'Demo Walkthrough Limit: You have used your 1 free AI Prescription Scan credit. Start your 14-day free trial for full AI prescription scanning, or tap "Try Sample Slip" to test the UI for free.',
      'DEMO_AI_LIMIT_REACHED'
    );
  }
}

/**
 * Enforces that demo clinics can test adding at most 1 patient (max 2 total: 1 sample + 1 test).
 */
export async function assertDemoPatientLimit(user: SessionUser): Promise<void> {
  if (!isDemoUser(user)) return;

  const currentCount = await prisma.patient.count({
    where: { clinicId: user.clinicId },
  });

  if (currentCount >= 2) {
    throw new DemoRestrictionError(
      403,
      'Demo Walkthrough Limit: In the shared demo clinic, you can test adding at most 1 patient. Start your 14-day free trial to add unlimited patients.',
      'DEMO_PATIENT_LIMIT_REACHED'
    );
  }
}

/**
 * Completely blocks file uploads to cloud storage (Backblaze B2) in demo clinics.
 */
export function assertDemoStorageAllowed(user: SessionUser): void {
  if (isDemoUser(user)) {
    throw new DemoRestrictionError(
      403,
      'Demo Walkthrough Mode: File storage uploads are disabled in the shared demo clinic to protect cloud resources. Create your free 14-day trial account to upload patient reports.',
      'DEMO_STORAGE_DISABLED'
    );
  }
}

/**
 * Prevents modifying clinic settings, passwords, and team members in demo clinics.
 */
export function assertDemoMutationAllowed(user: SessionUser, actionName: string): void {
  if (isDemoUser(user)) {
    throw new DemoRestrictionError(
      403,
      `Demo Walkthrough Mode: ${actionName} is locked in the shared demo clinic. Create your free clinic account to customize settings.`,
      'DEMO_MUTATION_LOCKED'
    );
  }
}

/**
 * Prevents deleting the original sample walkthrough patient (PT-0001).
 */
export function assertDemoPatientDeleteAllowed(user: SessionUser, patientCode: string): void {
  if (isDemoUser(user) && patientCode === 'PT-0001') {
    throw new DemoRestrictionError(
      403,
      'Demo Walkthrough Mode: The pre-filled sample patient cannot be deleted in the demo clinic.',
      'DEMO_PATIENT_PROTECTED'
    );
  }
}
