import test from 'node:test';
import assert from 'node:assert';
import {
  PLAN_DEFAULTS,
  PLAN_ORDER,
  getPlanDefinition,
  getPlanFeatures,
  yearlyPriceInr,
  isSubscriptionActive,
} from '../src/lib/plans';

test('Plan tiers and pricing: affordable tiers are correctly defined', () => {
  assert.strictEqual(PLAN_DEFAULTS.SOLO.monthlyPriceInr, 299);
  assert.strictEqual(PLAN_DEFAULTS.CLINIC.monthlyPriceInr, 699);
  assert.strictEqual(PLAN_DEFAULTS.GROWTH.monthlyPriceInr, 1299);
  assert.strictEqual(PLAN_DEFAULTS.ENTERPRISE.monthlyPriceInr, 2499);

  // Yearly pricing = 10x monthly
  assert.strictEqual(yearlyPriceInr('SOLO'), 2990);
  assert.strictEqual(yearlyPriceInr('CLINIC'), 6990);
  assert.strictEqual(yearlyPriceInr('GROWTH'), 12990);
  assert.strictEqual(yearlyPriceInr('ENTERPRISE'), 24990);

  // PLAN_ORDER includes all tiers in ascending order
  assert.strictEqual(PLAN_ORDER[0], 'SOLO');
  assert.strictEqual(PLAN_ORDER[1], 'CLINIC');
  assert.strictEqual(PLAN_ORDER[2], 'GROWTH');
  assert.strictEqual(PLAN_ORDER[3], 'ENTERPRISE');

  // getPlanDefinition returns accurate metadata
  assert.strictEqual(getPlanDefinition('SOLO').shortName, 'Solo Pro');
});

test('Plan feature inheritance and gating', () => {
  const soloFeatures = getPlanFeatures('SOLO');
  assert.strictEqual(soloFeatures.billing, true);
  // upiQr is currently marked under development
  assert.strictEqual(soloFeatures.upiQr, false);
  assert.strictEqual(soloFeatures.queueWorkflow, false);
  assert.strictEqual(soloFeatures.multiDoctorBilling, false);
  // Dark mode, all themes, and thermal/custom print sizes unlocked across all tiers
  assert.strictEqual(soloFeatures.clinicThemes, true);
  assert.strictEqual(soloFeatures.nightAndLayoutCustomization, true);
  assert.strictEqual(soloFeatures.customPrintSizes, true);

  const clinicFeatures = getPlanFeatures('CLINIC');
  assert.strictEqual(clinicFeatures.billing, true);
  assert.strictEqual(clinicFeatures.queueWorkflow, true);
  assert.strictEqual(clinicFeatures.multiDoctorBilling, true);
  assert.strictEqual(clinicFeatures.multiBranch, false);
  assert.strictEqual(clinicFeatures.clinicThemes, true);
  assert.strictEqual(clinicFeatures.nightAndLayoutCustomization, true);
  assert.strictEqual(clinicFeatures.customPrintSizes, true);

  const enterpriseFeatures = getPlanFeatures('ENTERPRISE');
  assert.strictEqual(enterpriseFeatures.multiBranch, true);
  assert.strictEqual(enterpriseFeatures.whiteLabelBranding, true);
});

test('Subscription active checks: TRIAL vs ACTIVE vs SUSPENDED', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  assert.strictEqual(isSubscriptionActive('ACTIVE', null), true);
  assert.strictEqual(isSubscriptionActive('TRIAL', future), true);
  assert.strictEqual(isSubscriptionActive('TRIAL', past), false);
  assert.strictEqual(isSubscriptionActive('SUSPENDED', future), false);
});
