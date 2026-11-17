import { connection, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getActiveStorageProvider } from '@/lib/storage/router';
import { getInfrastructureStatus } from '@/lib/supabase';

export async function GET() {
  await connection();
  const infra = getInfrastructureStatus();
  const start = Date.now();

  const isGeminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const isResendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
  const storageProvider = getActiveStorageProvider();
  const isB2Configured = Boolean(
    process.env.B2_KEY_ID &&
    process.env.B2_APP_KEY &&
    process.env.B2_BUCKET
  );

  try {
    await prisma.$queryRaw`SELECT 1`;
    const queryDurationMs = Date.now() - start;
    const rawDbUrl = process.env.DATABASE_URL || '';
    const maskedDbUrl = rawDbUrl.replace(/:([^:@]+)@/, ':***@');
    const isPgBouncer = rawDbUrl.includes(':6543') || rawDbUrl.includes('pgbouncer=true');

    return NextResponse.json(
      {
        status: 'HEALTHY',
        ok: true,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        checks: {
          database: {
            status: 'UP',
            latencyMs: queryDurationMs,
            pooler: isPgBouncer ? 'pgbouncer_transaction_pooler' : 'direct',
            target: maskedDbUrl,
          },
          storage: {
            provider: storageProvider,
            configured: storageProvider === 'b2' ? isB2Configured : true,
            bucket: process.env.B2_BUCKET ? `${process.env.B2_BUCKET.slice(0, 3)}***` : 'local',
          },
          aiOcr: {
            service: 'Google Gemini',
            configured: isGeminiConfigured,
          },
          email: {
            service: 'Resend',
            configured: isResendConfigured,
          },
          supabaseMode: infra.supabaseMode,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Health-Status': 'HEALTHY',
        },
      }
    );
  } catch (error) {
    console.error('[HEALTH_CHECK_FAILED]', error);
    const queryDurationMs = Date.now() - start;
    const rawDbUrl = process.env.DATABASE_URL || '';
    const maskedDbUrl = rawDbUrl.replace(/:([^:@]+)@/, ':***@');

    return NextResponse.json(
      {
        status: 'UNHEALTHY',
        ok: false,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        checks: {
          database: {
            status: 'DOWN',
            latencyMs: queryDurationMs,
            error: error instanceof Error ? error.message : String(error),
            target: maskedDbUrl,
          },
          storage: {
            provider: storageProvider,
            configured: storageProvider === 'b2' ? isB2Configured : true,
          },
          aiOcr: {
            configured: isGeminiConfigured,
          },
          email: {
            configured: isResendConfigured,
          },
          supabaseMode: infra.supabaseMode,
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Health-Status': 'UNHEALTHY',
        },
      }
    );
  }
}
