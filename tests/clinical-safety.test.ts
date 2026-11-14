import test from 'node:test';
import assert from 'node:assert';
import { checkPrescriptionSafety } from '../src/lib/clinical-safety';

test('Clinical Safety: Penicillin allergy triggers critical alert', () => {
  const alerts = checkPrescriptionSafety({
    allergies: 'Penicillin, pollen',
    chronicConditions: null,
    medicines: [{ medicineName: 'Amoxicillin 500mg' }],
  });

  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].level, 'critical');
  assert.ok(alerts[0].message.includes('Beta-lactam') || alerts[0].message.includes('Penicillin'));
});

test('Clinical Safety: Sulfa allergy triggers cross-reactivity alert', () => {
  const alerts = checkPrescriptionSafety({
    allergies: 'Sulfa drugs',
    chronicConditions: null,
    medicines: [{ medicineName: 'Cotrimoxazole DS' }],
  });

  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].level, 'critical');
  assert.ok(alerts[0].message.includes('Sulfa'));
});

test('Clinical Safety: Duplicate drugs in prescription triggers warning', () => {
  const alerts = checkPrescriptionSafety({
    allergies: null,
    chronicConditions: null,
    medicines: [
      { medicineName: 'Paracetamol 650mg' },
      { medicineName: 'Tab. Paracetamol 500mg' },
    ],
  });

  assert.ok(alerts.some((a) => a.level === 'warning' && a.message.includes('duplicate')));
});

test('Clinical Safety: Chronic condition contraindication triggers warning', () => {
  const alerts = checkPrescriptionSafety({
    allergies: null,
    chronicConditions: 'Bronchial asthma since 2018',
    medicines: [{ medicineName: 'Ibuprofen 400mg' }],
  });

  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].level, 'warning');
  assert.ok(alerts[0].message.includes('Asthma') || alerts[0].message.includes('bronchospasm'));
});

test('Clinical Safety: Safe prescription returns empty alerts', () => {
  const alerts = checkPrescriptionSafety({
    allergies: 'None known',
    chronicConditions: null,
    medicines: [
      { medicineName: 'Vitamin C 500mg' },
      { medicineName: 'Zinc 50mg' },
    ],
  });

  assert.strictEqual(alerts.length, 0);
});
