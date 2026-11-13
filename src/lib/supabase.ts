import 'server-only';

export interface InfrastructureStatus {
  supabaseUrl: string;
  supabaseMode: 'dummy-local' | 'configured';
  databaseMode: 'local-pglite' | 'remote-postgres';
  storageProvider: string;
}

export function getSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    ''
  );
}

export function isDummySupabaseMode(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = getSupabasePublishableKey();
  return (
    !url ||
    !key ||
    url.includes('dummy') ||
    url.includes('YOUR_PROJECT_REF') ||
    key.startsWith('dummy-') ||
    key.includes('replace-with-real')
  );
}

export function getInfrastructureStatus(): InfrastructureStatus {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dummy-local-preview.supabase.co';
  const dbUrl = process.env.DATABASE_URL ?? '';
  const isLocalPg =
    dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost') || dbUrl === '';

  return {
    supabaseUrl: rawUrl,
    supabaseMode: isDummySupabaseMode() ? 'dummy-local' : 'configured',
    databaseMode: isLocalPg ? 'local-pglite' : 'remote-postgres',
    storageProvider: (process.env.ACTIVE_STORAGE_PROVIDER ?? 'local').toLowerCase(),
  };
}
