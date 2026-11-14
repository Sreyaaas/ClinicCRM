import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    // When using Supabase pooler (port 6543 or pooler.supabase.com)
    const isPooler = url.port === '6543' || url.hostname.includes('pooler.supabase.com');
    if (isPooler) {
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const optimizedUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: optimizedUrl
      ? {
          db: {
            url: optimizedUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Always cache client instance across warm serverless requests (both dev & prod)
globalForPrisma.prisma = prisma;
