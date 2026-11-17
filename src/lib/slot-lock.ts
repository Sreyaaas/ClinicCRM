/**
 * Computes a deterministic integer lock key for a doctor and scheduled appointment time.
 * This key is used with Postgres transaction-level advisory locks (`pg_advisory_xact_lock`)
 * to serialize concurrent booking attempts for the same doctor and minute without locking
 * other doctors or other time slots.
 */
export function getSlotLockKey(doctorId: string, scheduledAt: Date): number {
  const epochMinutes = Math.floor(scheduledAt.getTime() / (60 * 1000));
  const keyStr = `slot:${doctorId}:${epochMinutes}`;
  let hash = 0;
  for (let i = 0; i < keyStr.length; i++) {
    hash = (hash << 5) - hash + keyStr.charCodeAt(i);
    hash |= 0; // Convert to signed 32-bit integer
  }
  return hash;
}

/**
 * Computes a deterministic integer lock key for a doctor's queue on a specific date.
 * Serializes concurrent check-in token generation so sequential numbering (#1, #2, #3...)
 * is strictly atomic and collision-free during peak OPD check-in rushes.
 */
export function getQueueLockKey(clinicId: string, doctorId: string, queueDay: string): number {
  const keyStr = `queue:${clinicId}:${doctorId}:${queueDay}`;
  let hash = 0;
  for (let i = 0; i < keyStr.length; i++) {
    hash = (hash << 5) - hash + keyStr.charCodeAt(i);
    hash |= 0; // Convert to signed 32-bit integer
  }
  return hash;
}

