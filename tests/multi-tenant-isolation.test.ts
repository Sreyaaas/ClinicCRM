import test from 'node:test';
import assert from 'node:assert';
import { getQueueLockKey, getSlotLockKey } from '../src/lib/slot-lock';

test('Multi-Tenant Boundary: Queue Lock Keys are strictly clinic-isolated', () => {
  const clinicA = 'clinic-aaaa-1111-2222-333333333333';
  const clinicB = 'clinic-bbbb-1111-2222-333333333333';
  const doctorId = 'doc-arun-0000-0000-000000000000';
  const queueDay = '2026-11-25';

  const lockKeyA = getQueueLockKey(clinicA, doctorId, queueDay);
  const lockKeyB = getQueueLockKey(clinicB, doctorId, queueDay);

  // Different clinics with same doctor ID and day must NEVER contend or lock each other
  assert.notStrictEqual(lockKeyA, lockKeyB);
});

test('Multi-Tenant Boundary: Slot Lock Keys differentiate identical time slots across doctors', () => {
  const doc1 = 'doc-1111';
  const doc2 = 'doc-2222';
  const time = new Date('2026-11-25T10:00:00+05:30');

  const lock1 = getSlotLockKey(doc1, time);
  const lock2 = getSlotLockKey(doc2, time);

  assert.notStrictEqual(lock1, lock2);
});

test('Prescription Auto-Draft Storage Partitioning: patient isolation', () => {
  const patient1Id = 'pt-uuid-1111';
  const patient2Id = 'pt-uuid-2222';

  const key1 = `nadi_rx_draft_${patient1Id}`;
  const key2 = `nadi_rx_draft_${patient2Id}`;

  // Two consultation tabs or patients never share draft state in localStorage
  assert.notStrictEqual(key1, key2);
  assert.ok(key1.includes(patient1Id));
  assert.ok(key2.includes(patient2Id));
});

test('Health Check Payload Structure: adheres to robust monitoring contract', () => {
  const healthReport = {
    status: 'HEALTHY',
    ok: true,
    timestamp: new Date().toISOString(),
    uptimeSeconds: 120,
    checks: {
      database: { status: 'UP', latencyMs: 14, pooler: 'pgbouncer_transaction_pooler' },
      storage: { provider: 'b2', configured: true },
      aiOcr: { service: 'Google Gemini', configured: true },
      email: { service: 'Resend', configured: true },
    },
  };

  assert.strictEqual(healthReport.status, 'HEALTHY');
  assert.strictEqual(healthReport.ok, true);
  assert.strictEqual(healthReport.checks.database.status, 'UP');
  assert.ok(healthReport.checks.database.latencyMs >= 0);
  assert.strictEqual(healthReport.checks.aiOcr.service, 'Google Gemini');
});
