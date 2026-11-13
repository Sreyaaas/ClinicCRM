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
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}
