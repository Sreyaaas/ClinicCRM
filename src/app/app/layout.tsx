import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { requireSessionUser } from '@/lib/auth';

export const instant = false;

async function AppLayoutGate({ children }: { children: React.ReactNode }) {
  const user = await requireSessionUser();
  return <AppShell user={user}>{children}</AppShell>;
}

function ShellFallback() {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-[248px] shrink-0 border-r border-line bg-surface md:block" />
      <div className="flex flex-1 flex-col gap-4 p-6 md:p-8">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
    </div>
  );
}

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AppLayoutGate>{children}</AppLayoutGate>
    </Suspense>
  );
}
