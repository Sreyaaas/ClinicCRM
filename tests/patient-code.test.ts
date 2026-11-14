import test from 'node:test';
import assert from 'node:assert';
import { generateNextPatientCode } from '../src/lib/patient-code';

test('Patient code generation handles empty database', async () => {
  const mockTx = {
    patient: {
      findFirst: async () => null,
      count: async () => 0,
    },
  };

  const code = await generateNextPatientCode(mockTx as unknown as Parameters<typeof generateNextPatientCode>[0], 'clinic-1');
  assert.strictEqual(code, 'PT-0001');
});

test('Patient code increments correctly from highest existing code', async () => {
  const mockTx = {
    patient: {
      findFirst: async () => ({ patientCode: 'PT-0042' }),
      count: async ({ where }: { where: { patientCode?: string } }) => (where.patientCode === 'PT-0043' ? 0 : 1),
    },
  };

  const code = await generateNextPatientCode(mockTx as unknown as Parameters<typeof generateNextPatientCode>[0], 'clinic-1');
  assert.strictEqual(code, 'PT-0043');
});

test('Patient code avoids existing collisions by incrementing candidate', async () => {
  let checked = 0;
  const mockTx = {
    patient: {
      findFirst: async () => ({ patientCode: 'PT-0002' }),
      count: async ({ where }: { where: { patientCode?: string } }) => {
        checked++;
        if (where.patientCode === 'PT-0003') return 1;
        return 0;
      },
    },
  };

  const code = await generateNextPatientCode(mockTx as unknown as Parameters<typeof generateNextPatientCode>[0], 'clinic-1');
  assert.strictEqual(code, 'PT-0004');
  assert.ok(checked >= 2);
});
