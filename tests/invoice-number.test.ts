import test from 'node:test';
import assert from 'node:assert';
import { generateNextInvoiceNumber } from '../src/lib/invoice-number';

test('Invoice number generates standard INV-YYYY-XXXX format', async () => {
  const currentYear = new Date().getFullYear();
  const mockTx = {
    billingRecord: {
      count: async ({ where }: { where: { clinicId?: string; invoiceNumber?: unknown } }) => {
        if (where.invoiceNumber) return 0;
        return 0; // zero existing bills this year
      },
    },
  };

  const invoice = await generateNextInvoiceNumber(mockTx as unknown as Parameters<typeof generateNextInvoiceNumber>[0], 'clinic-1');
  assert.strictEqual(invoice, `INV-${currentYear}-0001`);
});

test('Invoice number handles collisions safely', async () => {
  const currentYear = new Date().getFullYear();
  const mockTx = {
    billingRecord: {
      count: async ({ where }: { where: { clinicId?: string; invoiceNumber?: string } }) => {
        if (where.invoiceNumber === `INV-${currentYear}-0005`) return 1; // exists
        if (where.invoiceNumber === `INV-${currentYear}-0006`) return 0; // free
        return 4; // count returned 4, so initial candidate is 5
      },
    },
  };

  const invoice = await generateNextInvoiceNumber(mockTx as unknown as Parameters<typeof generateNextInvoiceNumber>[0], 'clinic-1');
  assert.strictEqual(invoice, `INV-${currentYear}-0006`);
});
