import Link from 'next/link';
import type { PlanTier } from '@prisma/client';
import { getPlanDefinition, getTierRequiredForFeature, type PlanFeatureKey } from '@/lib/plans';
import { IconArrowRight, IconCheck, IconLock } from './Icons';

export function PlanBadge({ tier }: { tier: PlanTier }) {
  const def = getPlanDefinition(tier);
  return <span className="badge">{def.shortName}</span>;
}

export function FeatureLockedCard({
  feature,
  title,
  description,
  currentTier,
}: {
  feature: PlanFeatureKey;
  title: string;
  description: string;
  currentTier: PlanTier;
}) {
  const required = getTierRequiredForFeature(feature);
  return (
    <section className="card mx-auto mt-4 flex max-w-xl flex-col items-center gap-4 px-6 py-12 text-center sm:px-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-ink">
        <IconLock className="h-5 w-5" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.015em]">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">{description}</p>
      </div>
      <ul className="flex flex-col gap-1.5 text-left text-[13px]">
        {required.highlights.slice(0, 3).map((h) => (
          <li key={h} className="flex items-start gap-2">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <Link href="/app/settings?tab=plan" className="btn btn-primary mt-2">
        Upgrade to {required.shortName} · ₹{required.monthlyPriceInr.toLocaleString('en-IN')}/mo
        <IconArrowRight />
      </Link>
      <p className="text-[12px] text-subtle">You&apos;re on {getPlanDefinition(currentTier).label}.</p>
    </section>
  );
}
