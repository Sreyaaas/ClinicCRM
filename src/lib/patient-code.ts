import type { Prisma } from '@prisma/client';

/** Generates the next per-clinic patient code like PT-0001 inside a transaction. */
export async function generateNextPatientCode(
  tx: Prisma.TransactionClient,
  clinicId: string
): Promise<string> {
  const latest = await tx.patient.findFirst({
    where: { clinicId },
    orderBy: { createdAt: 'desc' },
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

  return `PT-${String(nextNum).padStart(4, '0')}`;
}
