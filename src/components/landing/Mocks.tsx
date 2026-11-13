import type { ReactNode } from 'react';
import {
  IconBilling,
  IconChevronDown,
  IconFollowUp,
  IconHome,
  IconMessage,
  IconMore,
  IconPatients,
  IconPhone,
  IconSearch,
  IconSettings,
} from '@/components/Icons';


/* ───────────────────────── Small UI pieces (mirror the real app) ───────────────────────── */

type Tone = 'brand' | 'blue' | 'violet' | 'amber';

export function Av({ i, tone = 'brand' }: { i: string; tone?: Tone }) {
  const map: Record<Tone, string> = {
    brand: 'bg-brand-soft text-brand-ink',
    blue: 'bg-[#e3ecfb] text-[#1e40af]',
    violet: 'bg-[#ece7fb] text-[#5b21b6]',
    amber: 'bg-[#fbf0d9] text-[#92400e]',
  };
  return (
    <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${map[tone]}`}>
      {i}
    </span>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

/* ───────────────────────── Desktop product shot ───────────────────────── */

export function DesktopShot() {
  const queue: Array<{ t: number; n: string; m: string; s: string; active?: boolean }> = [
    { t: 14, n: 'Anjali Menon', m: 'Fever, 2 days · BP 118/76', s: 'With doctor', active: true },
    { t: 15, n: 'Rahul Nair', m: 'Diabetes review · 82 kg', s: 'Waiting' },
    { t: 16, n: 'Fathima K.', m: 'Lab report check', s: 'Waiting' },
    { t: 17, n: 'Joseph Mathew', m: 'BP follow-up', s: 'Waiting' },
  ];
  const appts = [
    ['10:30 AM', 'Lakshmi Pillai', 'Thyroid review'],
    ['11:00 AM', 'Arjun Das', 'New patient'],
    ['12:15 PM', 'Sara Thomas', 'Antenatal visit'],
  ];
  const nav: Array<[typeof IconHome, string, boolean]> = [
    [IconHome, 'Today', true],
    [IconPatients, 'Patients', false],
    [IconFollowUp, 'Follow-ups', false],
    [IconBilling, 'Billing', false],
    [IconSettings, 'Settings', false],
  ];
  return (
    <div className="overflow-hidden rounded-[14px] border border-line-strong bg-surface shadow-pop">
      <div className="flex h-9 items-center gap-2 border-b border-line bg-surface-2 px-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
      </div>
      <div className="grid grid-cols-[188px_1fr] text-left max-md:grid-cols-1">
        <aside className="border-r border-line p-3 max-md:hidden">
          <div className="flex items-center gap-2 px-1.5 py-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[12px] font-semibold text-[var(--brand-contrast)]">M</span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold">Malabar Polyclinic</p>
              <p className="text-[10.5px] text-muted">Clinic Core</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] text-subtle">
            <IconSearch className="h-3.5 w-3.5" /> Search patients…
          </div>
          <div className="mt-3 flex flex-col gap-0.5">
            {nav.map(([I, l, on]) => (
              <span
                key={l}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] ${on ? 'bg-brand-soft font-medium text-brand-ink' : 'text-muted'}`}
              >
                <I className="h-4 w-4" /> {l}
              </span>
            ))}
          </div>
        </aside>
        <div className="p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11.5px] text-muted">Wednesday, 11 November</p>
              <p className="text-[19px] font-semibold tracking-[-0.02em]">Good morning, Dr. Menon</p>
            </div>
            <div className="flex gap-1.5">
              <span className="rounded-lg border border-line-strong px-3 py-1.5 text-[11.5px] font-medium">Book</span>
              <span className="rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-medium text-[var(--brand-contrast)]">Check in</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 max-sm:grid-cols-2">
            {[
              ['Waiting', '6'],
              ['With doctor', '1'],
              ['Appointments', '9'],
              ['Visits today', '23'],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-line px-3 py-2.5">
                <p className="text-[10.5px] text-muted">{l}</p>
                <p className="text-[18px] font-semibold tnum">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1.35fr_1fr]">
            <div className="overflow-hidden rounded-lg border border-line">
              <p className="border-b border-line px-3.5 py-2.5 text-[12px] font-semibold">Queue</p>
              {queue.map((q) => (
                <div
                  key={q.t}
                  className={`flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0 ${q.active ? 'bg-brand-softer' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold tnum ${
                      q.active ? 'bg-brand text-[var(--brand-contrast)]' : 'border border-line bg-surface-2'
                    }`}
                  >
                    {q.t}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{q.n}</p>
                    <p className="truncate text-[10.5px] text-muted">{q.m}</p>
                  </div>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${q.active ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-muted'}`}
                  >
                    {q.s}
                  </span>
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-lg border border-line max-md:hidden">
              <p className="border-b border-line px-3.5 py-2.5 text-[12px] font-semibold">Appointments</p>
              {appts.map(([t, n, r]) => (
                <div key={n} className="flex items-center gap-3 border-b border-line px-3.5 py-2.5 last:border-0">
                  <span className="w-14 text-[11px] font-semibold tnum">{t}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{n}</p>
                    <p className="truncate text-[10.5px] text-muted">{r}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Phone ───────────────────────── */

export function StatusBar() {
  return (
    <div className="relative flex h-11 shrink-0 items-center justify-between px-6 text-[12px] font-semibold">
      <span className="tnum">9:41</span>
      <span className="absolute left-1/2 top-2.5 h-[22px] w-[82px] -translate-x-1/2 rounded-full bg-[var(--fg)]" />
      <span className="flex items-center gap-1">
        <svg viewBox="0 0 18 12" className="h-2.5 w-4" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor" />
          <rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
        </svg>
        <svg viewBox="0 0 26 12" className="h-2.5 w-6" aria-hidden="true">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor" />
          <rect x="23.5" y="4" width="1.8" height="4" rx="0.8" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

export function PhoneChart() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-[296px] shrink-0 rounded-[48px] bg-[var(--fg)] p-[9px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.4),0_0_0_1px_rgb(0_0_0/0.25)]"
    >
      <div className="flex h-[600px] flex-col overflow-hidden rounded-[40px] bg-bg">
        <StatusBar />
        <div className="flex items-center gap-2 border-b border-line px-4 pb-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] font-semibold text-[var(--brand-contrast)]">M</span>
          <span className="flex-1 truncate text-[13px] font-semibold">Malabar Polyclinic</span>
          <IconSearch className="h-4 w-4 text-muted" />
        </div>
        <div className="flex-1 overflow-hidden px-3.5 pt-3">
          <p className="text-[11.5px] text-muted">← Patients</p>
          <div className="mt-2 rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-center gap-3">
              <Av i="RN" tone="blue" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-[-0.01em]">Rahul Nair</p>
                <p className="truncate text-[11px] text-muted">52 yrs · Male · 98470 12345</p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[10px] font-medium text-danger">Allergy: Sulfa</span>
              <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">Type 2 diabetes</span>
            </div>
            <div className="mt-3 flex gap-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong">
                <IconPhone className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong">
                <IconMessage className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-8 flex-1 items-center justify-center rounded-lg bg-brand text-[11.5px] font-medium text-[var(--brand-contrast)]">
                New consultation
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-4 border-b border-line px-1 text-[11.5px]">
            <span className="-mb-px border-b-2 border-brand pb-2 font-medium">Visits 6</span>
            <span className="pb-2 text-muted">Reports 3</span>
            <span className="pb-2 text-muted">Bills 6</span>
          </div>
          <div className="mt-3 rounded-2xl border border-line bg-surface">
            <div className="flex items-start gap-3 p-3">
              <div className="w-9 text-center">
                <p className="text-[9px] font-medium uppercase text-muted">Nov</p>
                <p className="text-[17px] font-semibold leading-none tnum">4</p>
              </div>
              <div className="flex-1">
                <p className="text-[12.5px] font-semibold">Diabetes review</p>
                <p className="text-[10.5px] text-muted">Dr. Menon · 2 medicines</p>
              </div>
              <IconChevronDown className="h-3.5 w-3.5 rotate-180 text-subtle" />
            </div>
            <div className="border-t border-line px-3 pb-3 pt-2.5">
              <p className="text-[10px] text-muted">Prescription</p>
              <div className="mt-1.5 overflow-hidden rounded-lg border border-line text-[11px]">
                {[
                  ['Tab. Metformin 500', '1-0-1 · After food · 30 d'],
                  ['Tab. Glimepiride 1', '1-0-0 · Before food · 30 d'],
                ].map(([n, d]) => (
                  <div key={n} className="border-b border-line px-2.5 py-1.5 last:border-0">
                    <p className="font-medium">{n}</p>
                    <p className="text-[10px] text-muted">{d}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-muted">HbA1c 7.1 · Review in 3 months</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-line bg-surface">
          <div className="grid grid-cols-5 items-center px-2 pb-1 pt-1.5 text-[9.5px] font-medium">
            <span className="flex flex-col items-center gap-0.5 text-muted">
              <IconHome className="h-[18px] w-[18px]" /> Today
            </span>
            <span className="flex flex-col items-center gap-0.5 text-brand-ink">
              <IconPatients className="h-[18px] w-[18px]" /> Patients
            </span>
            <span className="flex justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-[var(--brand-contrast)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </span>
            </span>
            <span className="flex flex-col items-center gap-0.5 text-muted">
              <IconBilling className="h-[18px] w-[18px]" /> Billing
            </span>
            <span className="flex flex-col items-center gap-0.5 text-muted">
              <IconMore className="h-[18px] w-[18px]" /> More
            </span>
          </div>
          <div className="flex justify-center pb-2 pt-1">
            <span className="h-1 w-28 rounded-full bg-[var(--fg)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const QR_ROWS = [
  '111111101011101111111',
  '100000101100101000001',
  '101110100111001011101',
  '101110101001101011101',
  '101110100110001011101',
  '100000101011101000001',
  '111111101010101111111',
  '000000001101100000000',
  '110101111010111010110',
  '011000010111001101001',
  '101111101101110010111',
  '010010011010101101010',
  '111001111001011100101',
  '000000001011010101100',
  '111111100110111001011',
  '100000101101001110100',
  '101110100011110101111',
  '101110101110001010001',
  '101110100101110111010',
  '100000101010011001101',
  '111111101101101011011',
];

