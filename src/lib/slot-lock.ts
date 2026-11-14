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
