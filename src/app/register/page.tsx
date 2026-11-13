import type { Metadata } from 'next';
import type { PlanTier } from '@prisma/client';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';
import { RegisterClient } from '@/components/RegisterClient';
import { PLAN_ORDER } from '@/lib/plans';

async function RegisterLoader({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolved = await searchParams;
  const rawTier = typeof resolved.tier === 'string' ? resolved.tier.toUpperCase() : 'SOLO';
  const initialTier: PlanTier = PLAN_ORDER.includes(rawTier as PlanTier)
    ? (rawTier as PlanTier)
    : 'SOLO';

  return <RegisterClient initialTier={initialTier} />;
}

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage({ searchParams }: PageProps<'/register'>) {
  return (
    <div data-landing style={DEFAULT_PALETTE.vars as React.CSSProperties} className="theme-light min-h-dvh">
      <Suspense fallback={<PageSkeleton />}>
        <RegisterLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
