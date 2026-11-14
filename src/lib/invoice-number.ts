import 'server-only';
import type { Prisma, PrismaClient } from '@prisma/client';

type TxClient = Prisma.TransactionClient | PrismaClient;

export async function generateNextInvoiceNumber(tx: TxClient, clinicId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await tx.billingRecord.count({
    where: {
      clinicId,
      invoiceNumber: { startsWith: prefix },
    },
  });

  let nextNum = count + 1;
  let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
  while (
    (await tx.billingRecord.count({
      where: { clinicId, invoiceNumber: candidate },
    })) > 0
  ) {
    nextNum++;
    candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
}
