import test from 'node:test';
import assert from 'node:assert';
import { getSlotLockKey, getQueueLockKey } from '../src/lib/slot-lock';
import { getIstHhmm, formatClockTime } from '../src/lib/date';

test('Slot Lock Key: deterministic and integer-safe', () => {
  const docId = '11111111-2222-3333-4444-555555555555';
  const slotDate1 = new Date('2026-11-20T11:00:00.000+05:30');
  const slotDate2 = new Date('2026-11-20T11:00:00.000+05:30');
  const slotDate3 = new Date('2026-11-20T11:30:00.000+05:30');
  const otherDocId = '99999999-8888-7777-6666-555555555555';

  const key1 = getSlotLockKey(docId, slotDate1);
  const key2 = getSlotLockKey(docId, slotDate2);
  const key3 = getSlotLockKey(docId, slotDate3);
  const otherDocKey = getSlotLockKey(otherDocId, slotDate1);

  // Exact same doctor and time produces identical lock key
  assert.strictEqual(key1, key2);

  // Different slot times for same doctor produce different keys
  assert.notStrictEqual(key1, key3);

  // Different doctors for same time produce different keys (no cross-doctor contention)
  assert.notStrictEqual(key1, otherDocKey);

  // Key is a valid signed 32-bit integer for Postgres advisory locks
  assert.ok(Number.isInteger(key1));
  assert.ok(key1 >= -2147483648 && key1 <= 2147483647);
});

test('Queue Lock Key: deterministic, clinic-scoped, and integer-safe', () => {
  const clinicId = 'c1111111-2222-3333-4444-555555555555';
  const docId = 'd1111111-2222-3333-4444-555555555555';
  const queueDay = '2026-11-20';

  const k1 = getQueueLockKey(clinicId, docId, queueDay);
  const k2 = getQueueLockKey(clinicId, docId, queueDay);
  const kDiffDay = getQueueLockKey(clinicId, docId, '2026-11-21');
  const kDiffDoc = getQueueLockKey(clinicId, 'other-doc', queueDay);
  const kDiffClinic = getQueueLockKey('other-clinic', docId, queueDay);

  assert.strictEqual(k1, k2);
  assert.notStrictEqual(k1, kDiffDay);
  assert.notStrictEqual(k1, kDiffDoc);
  assert.notStrictEqual(k1, kDiffClinic);

  assert.ok(Number.isInteger(k1));
  assert.ok(k1 >= -2147483648 && k1 <= 2147483647);
});

test('Time slot IST formatter: extracts 24h HH:MM reliably', () => {
  const d1 = new Date('2026-11-20T11:00:00.000+05:30');
  const d2 = new Date('2026-11-20T16:30:00.000+05:30');
  const d3 = new Date('2026-11-20T09:05:00.000+05:30');

  assert.strictEqual(getIstHhmm(d1), '11:00');
  assert.strictEqual(getIstHhmm(d2), '16:30');
  assert.strictEqual(getIstHhmm(d3), '09:05');

  assert.strictEqual(formatClockTime('11:00'), '11:00 AM');
  assert.strictEqual(formatClockTime('16:30'), '4:30 PM');
});

test('Concurrency Simulation: 3 simultaneous requests for 11:00 AM slot', async () => {
  // Simulate 3 patients competing for 1 slot
  const slot = { doctorId: 'doc-arun', scheduledAt: '2026-11-25T11:00:00+05:30', booked: false };

  // Simulated transactional book function with advisory locking simulation
  let activeLock = false;
  const bookSlot = async (patientName: string): Promise<{ success: boolean; status: number; patient: string }> => {
    // Acquire mutex (advisory lock)
    while (activeLock) {
      await new Promise((r) => setTimeout(r, 2));
    }
    activeLock = true;
    try {
      if (slot.booked) {
        return { success: false, status: 409, patient: patientName };
      }
      slot.booked = true;
      return { success: true, status: 201, patient: patientName };
    } finally {
      activeLock = false;
    }
  };

  const results = await Promise.all([
    bookSlot('Rahul'),
    bookSlot('Ananya'),
    bookSlot('Vijay'),
  ]);

  const successes = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409);

  // Exactly one patient gets the slot
  assert.strictEqual(successes.length, 1);
  // Exactly two patients get 409 conflict
  assert.strictEqual(conflicts.length, 2);
  assert.strictEqual(slot.booked, true);
});
