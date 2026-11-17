'use client';

import type { PlanTier } from '@prisma/client';
import Link from 'next/link';
import { useState } from 'react';
import { formatStorageMb, PLAN_DEFAULTS, PLAN_ORDER, type PlanFeatureKey } from '@/lib/plans';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { IconSparkle } from '../Icons';

type Cell = boolean | string;

const PLAN_BLURB: Record<PlanTier, string> = {
  STARTER: 'Try it out',
  SOLO: 'For a single doctor',
  CLINIC: 'Up to 5 doctors',
  GROWTH: 'Multi-specialty clinics',
  ENTERPRISE: 'Groups & branches',
};

const LIMIT_ROWS: Array<{ label: string; value: (t: PlanTier) => string }> = [
  { label: 'Doctors', value: (t) => (PLAN_DEFAULTS[t].maxDoctors >= 999 ? 'Unlimited' : String(PLAN_DEFAULTS[t].maxDoctors)) },
  { label: 'Front-desk logins', value: (t) => (PLAN_DEFAULTS[t].maxStaff >= 999 ? 'Unlimited' : PLAN_DEFAULTS[t].maxStaff === 0 ? '—' : String(PLAN_DEFAULTS[t].maxStaff)) },
  { label: 'Patients', value: (t) => (PLAN_DEFAULTS[t].maxPatients === null ? 'Unlimited' : String(PLAN_DEFAULTS[t].maxPatients)) },
  { label: 'File storage', value: (t) => formatStorageMb(PLAN_DEFAULTS[t].maxStorageMb) },
  { label: 'Branches', value: (t) => String(PLAN_DEFAULTS[t].maxBranches) },
];

const FEATURE_ROWS: Array<{ label: string; key?: PlanFeatureKey; all?: true }> = [
  { label: 'Patient records & history', all: true },
  { label: 'Report & slip scanning', all: true },
  { label: 'WhatsApp follow-up reminders', all: true },
  { label: 'Dark mode & all 6 clinic themes', all: true },
  { label: 'A4, A5 & 80mm thermal printing', all: true },
  { label: 'Appointments & online booking', key: 'publicBooking' },
  { label: 'OPD billing & daily cash tally', key: 'billing' },
  { label: 'Quick packs & allergy alerts', key: 'allergySafety' },
  { label: 'Medical certificates & forms', key: 'certificatesPrint' },
  { label: 'Front-desk staff & nurse logins', key: 'teamManagement' },
  { label: 'Token queue & waiting-room TV', key: 'queueWorkflow' },
  { label: 'Multi-doctor OPD fee splitting', key: 'multiDoctorBilling' },
  { label: 'Expense tracking & cash tally', key: 'expensesTracker' },
  { label: 'Itemized GST tax invoices', key: 'itemizedGstBilling' },
  { label: 'MIS profit reports & CA CSV export', key: 'analyticsMis' },
  { label: 'Lab & pharmacy order tracker', key: 'labAndPharmacy' },
  { label: 'Staff activity audit trail', key: 'auditLogs' },
  { label: 'Multiple branches (up to 10)', key: 'multiBranch' },
  { label: 'White-label & custom brand colors', key: 'whiteLabelBranding' },
];

function cell(row: (typeof FEATURE_ROWS)[number], t: PlanTier): Cell {
  return row.all ? true : Boolean(row.key && PLAN_DEFAULTS[t].features[row.key]);
}

function Mark({ v }: { v: Cell }) {
  if (typeof v === 'string') return <span className="tnum">{v}</span>;
  return v ? (
    <span aria-label="Included" className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span aria-label="Not included" className="text-[var(--ghost-2,var(--subtle))]">
      —
    </span>
  );
}

function price(t: PlanTier, yearly: boolean) {
  if (t === 'ENTERPRISE') {
    return { main: 'Custom', sub: 'Talk to sales', strikethrough: null as string | null, badge: null as string | null };
  }
  if (t === 'CLINIC' || t === 'GROWTH') {
    return { main: 'Price to be disclosed', sub: '14-day trial included', strikethrough: null, badge: null };
  }
  if (t === 'SOLO') {
    if (yearly) {
      return {
        main: '₹249',
        sub: '₹2,988 billed yearly (₹249/mo · Save ₹1,200)',
        strikethrough: '₹299',
        badge: 'Limited time offer',
      };
    }
    return {
      main: '₹349',
      sub: 'per month · Cancel anytime',
      strikethrough: null,
      badge: null,
    };
  }
  const m = PLAN_DEFAULTS[t].monthlyPriceInr;
  if (m === 0) return { main: '₹0', sub: 'Free forever', strikethrough: null, badge: null };
  if (yearly) {
    const perMonth = Math.round((m * 10) / 12);
    return { main: `₹${perMonth.toLocaleString('en-IN')}`, sub: `₹${(m * 10).toLocaleString('en-IN')} billed yearly`, strikethrough: null, badge: null };
  }
  return { main: `₹${m.toLocaleString('en-IN')}`, sub: 'per month', strikethrough: null, badge: null };
}

export function PricingTable() {
  const [yearly, setYearly] = useState(true);
  const [mobileTier, setMobileTier] = useState<PlanTier>('CLINIC');

  const toggle = (
    <div className="seg" role="group" aria-label="Billing period">
      <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>
        Monthly
      </button>
      <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>
        Yearly <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand-ink">−17%</span>
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-[14px] text-muted">Prices exclude GST · Every plan starts with a <span className="font-medium text-fg">14-day free trial</span> · Yearly = 2 months free</p>
        {toggle}
      </div>

      {/* Desktop: comparison table */}
      <div className="mt-8 hidden overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:block">
        <table className="w-full table-fixed border-collapse text-[14px]">
          <colgroup>
            <col className="w-[24%]" />
            {PLAN_ORDER.map((t) => (
              <col key={t} />
            ))}
          </colgroup>
          <thead>
            <tr className="align-top">
              <th className="border-b border-line p-6 text-left align-bottom font-normal">
                <p className="text-[13px] font-medium text-muted">{yearly ? 'Billed yearly' : 'Billed monthly'}</p>
              </th>
              {PLAN_ORDER.map((t) => {
                const p = PLAN_DEFAULTS[t];
                const m = p.monthlyPriceInr;
                const perMonth = yearly ? Math.round((m * 10) / 12) : m;
                return (
                  <th
                    key={t}
                    className={`relative border-b border-l border-line px-5 pb-6 pt-7 text-left font-normal ${
                      p.recommended ? 'bg-[var(--fg)] text-[var(--bg)]' : ''
                    }`}
                  >
                    {p.recommended && (
                      <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" aria-hidden="true" />
                    )}
                    <p
                      className={`h-4 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        p.recommended ? 'text-[var(--brand)]' : 'text-transparent'
                      }`}
                    >
                      {p.recommended ? 'Most popular' : '·'}
                    </p>
                    <p className="mt-1.5 truncate text-[16px] font-semibold tracking-[-0.01em]">{p.shortName}</p>
                    <p className={`mt-0.5 truncate text-[12.5px] ${p.recommended ? 'opacity-65' : 'text-muted'}`}>{PLAN_BLURB[t]}</p>
                    {t === 'ENTERPRISE' ? (
                      <>
                        <p className="mt-5 flex items-baseline gap-1">
                          <span className="text-[32px] font-bold leading-none tracking-[-0.035em]">
                            Custom
                          </span>
                        </p>
                        <p className={`mt-1.5 h-4 text-[12px] ${p.recommended ? 'opacity-65' : 'text-muted'}`}>
                          Talk to sales
                        </p>
                        <a
                          href={buildWhatsAppLink(
                            process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '919400000000',
                            'Hi Nadi Team,\nI would like to inquire about the Enterprise Network plan for my clinic / hospital chain. Please connect me with sales.'
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary mt-5 h-10 w-full text-[13.5px] font-semibold"
                        >
                          Talk to sales
                        </a>
                      </>
                    ) : t === 'CLINIC' || t === 'GROWTH' ? (
                      <>
                        <p className="mt-5 flex items-baseline gap-1">
                          <span className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
                            Price to be disclosed
                          </span>
                        </p>
                        <p className={`mt-1.5 h-4 text-[12px] ${p.recommended ? 'opacity-65' : 'text-muted'}`}>
                          14-day free trial included
                        </p>
                        <Link
                          href={`/register?tier=${t}`}
                          className={`btn mt-5 h-10 w-full text-[13.5px] font-semibold ${p.recommended ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          Start free trial
                        </Link>
                      </>
                    ) : (
                      <>
                        {t === 'SOLO' && yearly && (
                          <div className="mt-3 -mb-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink">
                              <IconSparkle className="h-3 w-3" />
                              Limited time offer
                            </span>
                          </div>
                        )}
                        <p className={`${t === 'SOLO' && yearly ? 'mt-2' : 'mt-5'} flex items-baseline gap-1.5`}>
                          {t === 'SOLO' && yearly && (
                            <span className="text-[18px] text-muted line-through font-normal tnum">
                              ₹299
                            </span>
                          )}
                          <span className="text-[32px] font-bold leading-none tracking-[-0.035em] tnum">
                            {t === 'SOLO' ? (yearly ? '₹249' : '₹349') : `₹${perMonth.toLocaleString('en-IN')}`}
                          </span>
                          <span className={`text-[13px] ${p.recommended ? 'opacity-65' : 'text-muted'}`}>/mo</span>
                        </p>
                        <p className={`mt-1.5 h-4 text-[12px] tnum ${p.recommended ? 'opacity-65' : 'text-muted'}`}>
                          {t === 'SOLO'
                            ? yearly
                              ? '₹2,988 a year · Save ₹1,200'
                              : 'Cancel anytime'
                            : yearly
                              ? `₹${(m * 10).toLocaleString('en-IN')} a year`
                              : 'Cancel anytime'}
                        </p>
                        <Link
                          href={`/register?tier=${t}`}
                          className={`btn mt-5 h-10 w-full text-[13.5px] font-semibold ${p.recommended ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          Start free trial
                        </Link>
                      </>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={PLAN_ORDER.length + 1} className="bg-surface-2 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                Limits
              </td>
            </tr>
            {LIMIT_ROWS.map((r) => (
              <tr key={r.label} className="border-t border-line transition-colors hover:bg-surface-2/60">
                <td className="px-6 py-3.5 font-medium">{r.label}</td>
                {PLAN_ORDER.map((t) => (
                  <td
                    key={t}
                    className={`border-l border-line px-4 py-3.5 text-center font-medium ${PLAN_DEFAULTS[t].recommended ? 'bg-brand-softer' : ''}`}
                  >
                    <Mark v={r.value(t)} />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <td colSpan={PLAN_ORDER.length + 1} className="bg-surface-2 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                Features
              </td>
            </tr>
            {FEATURE_ROWS.map((r) => (
              <tr key={r.label} className="border-t border-line transition-colors hover:bg-surface-2/60">
                <td className="px-6 py-3.5">{r.label}</td>
                {PLAN_ORDER.map((t) => (
                  <td
                    key={t}
                    className={`border-l border-line px-4 py-3.5 text-center ${PLAN_DEFAULTS[t].recommended ? 'bg-brand-softer' : ''}`}
                  >
                    <Mark v={cell(r, t)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile / tablet: one plan at a time */}
      <div className="mt-6 lg:hidden">
        <div className="scroll-x -mx-5 px-5">
          <div className="seg" role="group" aria-label="Choose a plan">
            {PLAN_ORDER.map((t) => (
              <button key={t} type="button" aria-pressed={mobileTier === t} onClick={() => setMobileTier(t)}>
                {PLAN_DEFAULTS[t].shortName}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const t = mobileTier;
          const p = PLAN_DEFAULTS[t];
          const pr = price(t, yearly);
          return (
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold">{p.label}</p>
                  {pr.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-ink">
                      <IconSparkle className="h-2.5 w-2.5" />
                      {pr.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13.5px] text-muted">{p.tagline}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  {pr.strikethrough && (
                    <span className="text-[18px] text-muted line-through font-normal tnum">
                      {pr.strikethrough}
                    </span>
                  )}
                  <p className="text-[24px] sm:text-[32px] font-semibold tracking-[-0.03em] tnum">
                    {pr.main}
                    {t === 'SOLO' && <span className="text-[14px] font-normal text-muted"> /month</span>}
                  </p>
                </div>
                <p className="text-[12.5px] text-muted">{pr.sub}</p>
                {t === 'ENTERPRISE' ? (
                  <a
                    href={buildWhatsAppLink(
                      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '919400000000',
                      'Hi Nadi Team,\nI would like to inquire about the Enterprise Network plan for my clinic / hospital chain. Please connect me with sales.'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary mt-5 w-full font-semibold"
                  >
                    Talk to sales
                  </a>
                ) : (
                  <Link href={`/register?tier=${t}`} className="btn btn-primary mt-5 w-full">
                    Start 14-day free trial
                  </Link>
                )}
              </div>
              <dl className="border-t border-line text-[14px]">
                {LIMIT_ROWS.map((r) => (
                  <div key={r.label} className="flex justify-between gap-4 border-b border-line px-5 py-3">
                    <dt className="text-muted">{r.label}</dt>
                    <dd className="font-medium tnum">{r.value(t)}</dd>
                  </div>
                ))}
              </dl>
              <ul className="flex flex-col gap-2.5 p-5 text-[14px]">
                {FEATURE_ROWS.map((r) => {
                  const on = cell(r, t);
                  return (
                    <li key={r.label} className={`flex items-center gap-3 ${on ? '' : 'text-subtle line-through decoration-[var(--line-strong)]'}`}>
                      <span className="w-4 text-center">
                        <Mark v={on} />
                      </span>
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
