import test from 'node:test';
import assert from 'node:assert';
import { getOptimizedDatabaseUrl } from '../src/lib/prisma';

test('Database URL optimizer adds pgbouncer=true and connection_limit=1 to Supabase poolers', () => {
  const originalEnv = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL = 'postgresql://postgres.test:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';
    const optimized = getOptimizedDatabaseUrl();
    assert.ok(optimized?.includes('pgbouncer=true'));
    assert.ok(optimized?.includes('connection_limit=1'));

    // Should preserve existing flags
    process.env.DATABASE_URL = 'postgresql://postgres.test:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require';
    const optimizedWithSsl = getOptimizedDatabaseUrl();
    assert.ok(optimizedWithSsl?.includes('sslmode=require'));
    assert.ok(optimizedWithSsl?.includes('pgbouncer=true'));
    assert.ok(optimizedWithSsl?.includes('connection_limit=1'));
  } finally {
    process.env.DATABASE_URL = originalEnv;
  }
});

test('Database URL optimizer leaves local database strings intact without port 6543', () => {
  const originalEnv = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5433/postgres';
    const optimized = getOptimizedDatabaseUrl();
    assert.strictEqual(optimized, 'postgresql://postgres:postgres@127.0.0.1:5433/postgres');
  } finally {
    process.env.DATABASE_URL = originalEnv;
  }
});
