import { connection, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveStorageProvider } from '@/lib/storage/router';
import { getInfrastructureStatus } from '@/lib/supabase';

export async function GET() {
  await connection();
  const infra = getInfrastructureStatus();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: 'connected',
      storageProvider: getActiveStorageProvider(),
      supabaseMode: infra.supabaseMode,
    });
  } catch (error) {
    console.error('[HEALTH_CHECK_FAILED]', error);
    return NextResponse.json(
      {
        ok: false,
        database: 'disconnected',
        storageProvider: getActiveStorageProvider(),
        supabaseMode: infra.supabaseMode,
      },
      { status: 503 }
    );
  }
}
