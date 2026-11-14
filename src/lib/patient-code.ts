import type { Prisma } from '@prisma/client';

/** Generates the next per-clinic patient code like PT-0001 inside a transaction. */
export async function generateNextPatientCode(
  tx: Prisma.TransactionClient,
  clinicId: string
): Promise<string> {
  // Sort by patientCode descending so we always read the highest allocated numerical code
  const latest = await tx.patient.findFirst({
    where: { clinicId },
    orderBy: [{ patientCode: 'desc' }, { createdAt: 'desc' }],
    select: { patientCode: true },
  });

  let nextNum = 1;
  if (latest?.patientCode) {
    const match = latest.patientCode.match(/(\d+)$/);
    if (match) {
      nextNum = Number.parseInt(match[1], 10) + 1;
    }
  } else {
    const count = await tx.patient.count({ where: { clinicId } });
    nextNum = count + 1;
  }

  // Ensure uniqueness in case of duplicate timestamps or concurrent creates
  let candidate = `PT-${String(nextNum).padStart(4, '0')}`;
  while ((await tx.patient.count({ where: { clinicId, patientCode: candidate } })) > 0) {
    nextNum++;
    candidate = `PT-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
}
