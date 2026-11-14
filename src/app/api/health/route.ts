import { connection, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveStorageProvider } from '@/lib/storage/router';
import { getInfrastructureStatus } from '@/lib/supabase';

export async function GET() {
  await connection();
  const infra = getInfrastructureStatus();
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const queryDurationMs = Date.now() - start;
    const rawDbUrl = process.env.DATABASE_URL || '';
    const maskedDbUrl = rawDbUrl.replace(/:([^:@]+)@/, ':***@');
    return NextResponse.json({
      ok: true,
      database: 'connected',
      queryDurationMs,
      dbTarget: maskedDbUrl,
      storageProvider: getActiveStorageProvider(),
      supabaseMode: infra.supabaseMode,
    });
  } catch (error) {
    console.error('[HEALTH_CHECK_FAILED]', error);
    const rawDbUrl = process.env.DATABASE_URL || '';
    const maskedDbUrl = rawDbUrl.replace(/:([^:@]+)@/, ':***@');
    return NextResponse.json(
      {
        ok: false,
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
        dbTarget: maskedDbUrl,
        storageProvider: getActiveStorageProvider(),
        supabaseMode: infra.supabaseMode,
      },
      { status: 503 }
    );
  }
}
