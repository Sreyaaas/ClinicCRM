import test from 'node:test';
import assert from 'node:assert';
import { PLAN_DEFAULTS, yearlyPriceInr } from '../src/lib/plans';
import { createPlanUpgradeWhatsAppUrl } from '../src/lib/whatsapp';

test('Plan Switch: Annual billing offers 2 months free (10x monthly price)', () => {
  for (const tier of ['SOLO', 'CLINIC', 'GROWTH', 'ENTERPRISE'] as const) {
    const p = PLAN_DEFAULTS[tier];
    const annual = yearlyPriceInr(tier);
    if (tier === 'SOLO') {
      assert.strictEqual(annual, 2988);
      // Savings = 349 * 12 - 2988 = 1200
      assert.strictEqual(p.monthlyPriceInr * 12 - annual, 1200);
    } else {
      assert.strictEqual(annual, p.monthlyPriceInr * 10);
      const savings = p.monthlyPriceInr * 12 - annual;
      assert.strictEqual(savings, p.monthlyPriceInr * 2);
    }
  }
});

test('Plan Switch: WhatsApp concierge upgrade link generates valid URI with clinic details', () => {
  const url = createPlanUpgradeWhatsAppUrl({
    clinicName: 'Malabar Care Clinic',
    clinicSlug: 'malabar-care',
    doctorName: 'Dr. Arun Kumar',
    planName: 'Clinic Core',
    interval: 'yearly',
    amountInr: 6990,
    supportPhone: '919876543210',
  });

  assert.ok(url.startsWith('https://wa.me/919876543210?text='));
  const decoded = decodeURIComponent(url.replace('https://wa.me/919876543210?text=', ''));

  assert.ok(decoded.includes('Malabar Care Clinic'));
  assert.ok(decoded.includes('malabar-care'));
  assert.ok(decoded.includes('Clinic Core'));
  assert.ok(decoded.includes('Yearly (2 Months Free)'));
  assert.ok(decoded.includes('6,990'));
  assert.ok(decoded.includes('GST invoice'));
});

test('Plan Switch: Monthly WhatsApp upgrade link formatting', () => {
  const url = createPlanUpgradeWhatsAppUrl({
    clinicName: 'Solo OPD',
    clinicSlug: 'solo-opd',
    planName: 'Solo Pro',
    interval: 'monthly',
    amountInr: 299,
    supportPhone: '9847012345',
  });

  assert.ok(url.startsWith('https://wa.me/919847012345?text='));
  const decoded = decodeURIComponent(url.replace('https://wa.me/919847012345?text=', ''));
  assert.ok(decoded.includes('Monthly'));
  assert.ok(decoded.includes('299'));
});

test('Plan Switch: Capacity limit rules prevent invalid downgrades', () => {
  const soloPlan = PLAN_DEFAULTS.SOLO;
  const clinicPlan = PLAN_DEFAULTS.CLINIC;

  // Solo allows max 1 doctor and 0 staff
  assert.strictEqual(soloPlan.maxDoctors, 1);
  assert.strictEqual(soloPlan.maxStaff, 0);

  // Clinic Core allows max 5 doctors and 5 staff
  assert.strictEqual(clinicPlan.maxDoctors, 5);
  assert.strictEqual(clinicPlan.maxStaff, 5);

  // If clinic has 2 doctors, it can exist on CLINIC but cannot downgrade to SOLO
  const clinicWith2Doctors = 2;
  assert.ok(clinicWith2Doctors <= clinicPlan.maxDoctors);
  assert.ok(clinicWith2Doctors > soloPlan.maxDoctors, 'Should exceed Solo limit');
});
