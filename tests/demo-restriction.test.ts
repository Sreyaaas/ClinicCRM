import test from 'node:test';
import assert from 'node:assert';
import type { SessionUser } from '../src/lib/auth';
import {
  isDemoUser,
  isDemoClinicSlug,
  assertDemoStorageAllowed,
  assertDemoMutationAllowed,
  assertDemoPatientDeleteAllowed,
} from '../src/lib/demo-restriction';

function makeMockUser(email: string, slug?: string): SessionUser {
  return {
    id: 'mock-user-1',
    clinicId: 'mock-clinic-1',
    activeBranchId: null,
    name: 'Mock User',
    email,
    phone: '9847000000',
    role: 'OWNER_DOCTOR',
    specialty: 'General Practice',
    registrationNo: 'REG-1234',
    consultationFee: 200,
    defaultCaptureMode: 'HYBRID',
    preferredWhatsappLang: 'en',
    clinic: {
      id: 'mock-clinic-1',
      name: 'Mock Clinic',
      slug: slug ?? 'real-clinic-slug',
      phone: null,
      address: null,
      upiId: null,
      gstin: null,
      brandColor: '#0d9488',
      themePreset: 'teal',
      colorMode: 'light',
      uiDensity: 'comfortable',
      cardRadius: 'rounded',
      sidebarTone: 'light',
      printPaperSize: 'A4',
      rxFooterNote: null,
      rxWatermark: null,
      hidePoweredBy: false,
      whatsappLang: 'en',
      workingHours: '9am - 5pm',
      slotDurationMin: 15,
      enablePublicBooking: true,
      enableBilling: true,
      enableFollowUps: true,
      enableVitals: true,
      enableAppointments: true,
      enableOrders: false,
      planTier: 'SOLO',
      subscriptionStatus: 'ACTIVE',
      maxDoctors: 1,
      maxStaff: 0,
      maxPatients: null,
      maxStorageMb: 2048,
      maxBranches: 1,
      billingTiming: 'FLEXIBLE',
      defaultConsultFee: 200,
      trialEndsAt: null,
      trialDaysLeft: 14,
    },
  };
}

test('Demo Detection: recognizes demo users and demo clinic slugs', () => {
  // Demo email match
  assert.strictEqual(isDemoUser({ email: 'dr.arun@solo.in' }), true);
  assert.strictEqual(isDemoUser({ email: 'owner@malabarclinic.in' }), true);
  assert.strictEqual(isDemoUser({ email: 'staff@malabarclinic.in' }), true);

  // Demo clinic slug match
  assert.strictEqual(
    isDemoUser({ email: 'random.doctor@gmail.com', clinic: { slug: 'dr-arun-solo' } }),
    true
  );
  assert.strictEqual(
    isDemoUser({ email: 'visitor@test.com', clinic: { slug: 'malabar-polyclinic' } }),
    true
  );

  // Real clinic user should NOT be flagged as demo
  assert.strictEqual(
    isDemoUser({ email: 'real.doctor@apollo.com', clinic: { slug: 'apollo-kochi-99a1' } }),
    false
  );

  // Slug check helper
  assert.strictEqual(isDemoClinicSlug('dr-arun-solo'), true);
  assert.strictEqual(isDemoClinicSlug('starter-evening'), true);
  assert.strictEqual(isDemoClinicSlug('apollo-kochi'), false);
});

test('Demo Storage Restriction: blocks B2 cloud uploads for demo users', () => {
  const demoUser = makeMockUser('dr.arun@solo.in', 'dr-arun-solo');

  assert.throws(
    () => assertDemoStorageAllowed(demoUser),
    (err: unknown) => {
      const e = err as { status?: number; code?: string };
      return e.status === 403 && e.code === 'DEMO_STORAGE_DISABLED';
    }
  );

  const realUser = makeMockUser('sarah@realclinic.in', 'real-clinic-kochi');

  // Real user upload is allowed
  assert.doesNotThrow(() => assertDemoStorageAllowed(realUser));
});

test('Demo Mutation Restriction: blocks settings & password mutations for demo users', () => {
  const demoUser = makeMockUser('dr.arun@solo.in', 'dr-arun-solo');

  assert.throws(
    () => assertDemoMutationAllowed(demoUser, 'Password changes'),
    (err: unknown) => {
      const e = err as { status?: number; code?: string };
      return e.status === 403 && e.code === 'DEMO_MUTATION_LOCKED';
    }
  );
});

test('Demo Patient Protection: blocks deleting sample walkthrough patient PT-0001', () => {
  const demoUser = makeMockUser('dr.arun@solo.in', 'dr-arun-solo');

  // Attempting to delete original sample patient PT-0001 is rejected
  assert.throws(
    () => assertDemoPatientDeleteAllowed(demoUser, 'PT-0001'),
    (err: unknown) => {
      const e = err as { status?: number; code?: string };
      return e.status === 403 && e.code === 'DEMO_PATIENT_PROTECTED';
    }
  );

  // Deleting a test patient added by the visitor (e.g. PT-0002) is allowed
  assert.doesNotThrow(() => assertDemoPatientDeleteAllowed(demoUser, 'PT-0002'));
});
