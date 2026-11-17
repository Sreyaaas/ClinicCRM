'use client';

import type { PlanTier } from '@prisma/client';
import Link from 'next/link';
import { BrandLogo } from './Brand';
import { useState } from 'react';
import { formatStorageMb, PLAN_DEFAULTS, PLAN_ORDER } from '@/lib/plans';
import { IconAlert, IconCheck, IconEye, IconEyeOff } from './Icons';

export function RegisterClient({ initialTier }: { initialTier: PlanTier }) {
  const [planTier, setPlanTier] = useState<PlanTier>(initialTier);
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      window.location.replace('/app');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setSubmitting(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  return (
    <div className="brand-scope min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <BrandLogo />
        <p className="text-[13px] text-muted sm:text-[13.5px]">
          Have an account?{' '}
          <Link href="/login" className="link font-medium">
            Sign in
          </Link>
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <div className="max-w-xl">
          <h1 className="text-[25px] font-semibold tracking-[-0.025em] sm:text-[30px]">Set up your clinic</h1>
          <p className="mt-1 text-[14px] text-muted sm:text-[15px]">
            14 days free on any plan. No card needed. Switch plans anytime.
          </p>
        </div>

        {/* Mobile Plan Indicator badge */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface-2/80 px-4 py-2.5 text-[13px] lg:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted">Selected plan:</span>
            <strong className="font-semibold text-fg truncate">{plan.shortName}</strong>
            <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[11px] font-medium text-brand">
              {planTier === 'ENTERPRISE'
                ? 'Custom'
                : plan.monthlyPriceInr === 0
                  ? 'Free'
                  : `₹${plan.monthlyPriceInr}/mo`}
            </span>
          </div>
          <a
            href="#plan-selection"
            className="text-[12.5px] font-medium text-brand hover:underline shrink-0 ml-2"
          >
            Change
          </a>
        </div>

        <form onSubmit={submit} className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="card flex flex-col gap-6 p-4.5 sm:p-7">
            {/* Honeypot field for anti-bot protection */}
            <div className="sr-only" aria-hidden="true">
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

            <fieldset className="border-0 p-0 m-0 min-w-0">
              <legend className="mb-3 text-[14px] font-semibold text-fg">Clinic details</legend>
              <div className="flex flex-col gap-4">
                <div className="field">
                  <label htmlFor="reg-clinic" className="label">
                    Clinic name
                  </label>
                  <input
                    id="reg-clinic"
                    required
                    autoComplete="organization"
                    className="input"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="e.g. Malabar Care Polyclinic"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor="reg-doctor" className="label">
                      Your name
                    </label>
                    <input
                      id="reg-doctor"
                      required
                      autoComplete="name"
                      className="input"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. Anjali Menon"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="reg-specialty" className="label">
                      Specialty
                    </label>
                    <input
                      id="reg-specialty"
                      className="input"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. General Medicine"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="reg-phone" className="label">
                      Mobile <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className="input tnum"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="reg-fee" className="label">
                      Consultation fee
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium select-none">
                        ₹
                      </span>
                      <input
                        id="reg-fee"
                        inputMode="numeric"
                        className="input pl-8 tnum"
                        value={fee}
                        onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))}
                        placeholder="250"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            <div className="divider" />

            <fieldset className="border-0 p-0 m-0 min-w-0">
              <legend className="mb-3 text-[14px] font-semibold text-fg">Sign-in credentials</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label htmlFor="reg-email" className="label">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@clinic.in"
                  />
                </div>
                <div className="field">
                  <label htmlFor="reg-password" className="label">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className="input pr-10"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="hint">At least 6 characters</span>
                </div>
              </div>
            </fieldset>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <fieldset id="plan-selection" className="card overflow-hidden border border-line bg-surface">
              <legend className="sr-only">Choose a plan</legend>
              <div className="border-b border-line bg-surface-2/60 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
                <span className="text-[13.5px] sm:text-[14px] font-semibold">Choose your plan</span>
                <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                  14-day trial
                </span>
              </div>
              <ul className="list">
                {PLAN_ORDER.map((tier) => {
                  const p = PLAN_DEFAULTS[tier];
                  const selected = planTier === tier;
                  return (
                    <li key={tier}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 sm:px-5 transition-colors ${
                          selected ? 'bg-brand-softer' : 'hover:bg-surface-2'
                        }`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          className="sr-only"
                          checked={selected}
                          onChange={() => setPlanTier(tier)}
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                            selected ? 'border-brand bg-brand text-white' : 'border-line-strong'
                          }`}
                        >
                          {selected && <IconCheck className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-medium text-fg">{p.shortName}</span>
                            {p.badge && (
                              <span className="rounded bg-surface-3 px-1.5 py-0.2 text-[10px] font-medium text-muted">
                                {p.badge}
                              </span>
                            )}
                          </div>
                          <span className="block truncate text-[12px] text-muted">{p.tagline}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[13px] font-semibold tnum text-fg">
                            {tier === 'ENTERPRISE'
                              ? 'Custom'
                              : p.monthlyPriceInr === 0
                                ? 'Free'
                                : `₹${p.monthlyPriceInr.toLocaleString('en-IN')}`}
                          </span>
                          {tier !== 'ENTERPRISE' && (
                            <span className="block text-[10.5px] text-muted">/month</span>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-line bg-surface-2 px-4 py-3 sm:px-5 text-[12px] text-muted leading-relaxed">
                {plan.maxDoctors >= 999 ? 'Unlimited' : plan.maxDoctors} doctor
                {plan.maxDoctors === 1 ? '' : 's'} ·{' '}
                {plan.maxPatients === null ? 'unlimited patients' : `${plan.maxPatients} patients`} ·{' '}
                {formatStorageMb(plan.maxStorageMb)}
              </div>
            </fieldset>

            {error && (
              <div role="alert" className="alert alert-danger">
                <IconAlert />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg w-full text-[15px] font-semibold shadow-sm"
            >
              {submitting ? 'Creating your workspace…' : 'Start 14-day free trial'}
            </button>

            <p className="text-center text-[11.5px] text-muted">
              No card required · Instant access · Cancel anytime
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}
