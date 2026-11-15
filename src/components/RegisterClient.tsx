'use client';

import type { PlanTier } from '@prisma/client';
import Link from 'next/link';
import { BrandLogo } from './Brand';
import { useState } from 'react';
import { formatStorageMb, PLAN_DEFAULTS, PLAN_ORDER } from '@/lib/plans';
import { IconAlert, IconCheck } from './Icons';

export function RegisterClient({ initialTier }: { initialTier: PlanTier }) {
  const [planTier, setPlanTier] = useState<PlanTier>(initialTier);
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fee, setFee] = useState('250');
  const [hpWebsite, setHpWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const plan = PLAN_DEFAULTS[planTier];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          clinicName,
          doctorName,
          specialty,
          phone: phone || undefined,
          email,
          password,
          consultationFee: Number.parseInt(fee || '250', 10) || 250,
          hp_website: hpWebsite || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not create your account.');
        setSubmitting(false);
        return;
      }
      window.location.replace('/app');
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="brand-scope min-h-dvh">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <div className="self-start"><BrandLogo /></div>
        <p className="text-[13.5px] text-muted">
          Have an account?{' '}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6">
        <div className="max-w-xl">
          <h1 className="text-[30px] font-semibold tracking-[-0.025em]">Set up your clinic</h1>
          <p className="mt-1.5 text-[15px] text-muted">14 days free on any plan. No card needed. Switch plans anytime.</p>
        </div>

        <form onSubmit={submit} className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="card flex flex-col gap-6 p-5 sm:p-7">
            {/* Honeypot field for anti-bot protection */}
            <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="reg-hp-website">Website</label>
              <input
                id="reg-hp-website"
                type="text"
                name="hp_website"
                tabIndex={-1}
                autoComplete="off"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
              />
            </div>

            {error && (
              <div role="alert" className="alert alert-danger">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 text-[14px] font-semibold">Clinic</legend>
              <div className="field">
                <label htmlFor="reg-clinic" className="label">Clinic name</label>
                <input id="reg-clinic" required className="input" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g. Malabar Care Polyclinic" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="reg-doctor" className="label">Your name</label>
                  <input id="reg-doctor" required autoComplete="name" className="input" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Dr. Anjali Menon" />
                </div>
                <div className="field">
                  <label htmlFor="reg-specialty" className="label">Specialty</label>
                  <input id="reg-specialty" className="input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="reg-phone" className="label">Mobile <span className="font-normal text-muted">(optional)</span></label>
                  <input id="reg-phone" type="tel" inputMode="tel" className="input tnum" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="reg-fee" className="label">Consultation fee</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                    <input id="reg-fee" inputMode="numeric" className="input pl-7 tnum" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              </div>
            </fieldset>

            <div className="divider" />

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 text-[14px] font-semibold">Sign-in details</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="reg-email" className="label">Email</label>
                  <input id="reg-email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="reg-password" className="label">Password</label>
                  <input id="reg-password" type="password" autoComplete="new-password" minLength={6} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <span className="hint">At least 6 characters</span>
                </div>
              </div>
            </fieldset>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <fieldset className="card overflow-hidden">
              <legend className="sr-only">Choose a plan</legend>
              <div className="border-b border-line px-5 py-3.5 text-[14px] font-semibold">Plan</div>
              <ul className="list">
                {PLAN_ORDER.map((tier) => {
                  const p = PLAN_DEFAULTS[tier];
                  const selected = planTier === tier;
                  return (
                    <li key={tier}>
                      <label className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors ${selected ? 'bg-brand-softer' : 'hover:bg-surface-2'}`}>
                        <input type="radio" name="plan" className="sr-only" checked={selected} onChange={() => setPlanTier(tier)} />
                        <span
                          aria-hidden="true"
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand bg-brand text-white' : 'border-line-strong'}`}
                        >
                          {selected && <IconCheck className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium">{p.shortName}</span>
                          <span className="block truncate text-[12px] text-muted">{p.tagline}</span>
                        </span>
                        <span className="text-[13px] font-medium tnum">
                          {tier === 'ENTERPRISE'
                            ? 'Custom'
                            : p.monthlyPriceInr === 0
                              ? 'Free'
                              : `₹${p.monthlyPriceInr.toLocaleString('en-IN')}`}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-line bg-surface-2 px-5 py-3 text-[12.5px] text-muted">
                {plan.maxDoctors >= 999 ? 'Unlimited' : plan.maxDoctors} doctor{plan.maxDoctors === 1 ? '' : 's'} ·{' '}
                {plan.maxPatients === null ? 'unlimited patients' : `${plan.maxPatients} patients`} · {formatStorageMb(plan.maxStorageMb)}
              </div>
            </fieldset>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-lg w-full">
              {submitting ? 'Creating your workspace…' : 'Create clinic'}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
