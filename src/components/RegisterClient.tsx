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
    <div className="brand-scope min-h-dvh w-full overflow-x-hidden text-left">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <BrandLogo />
        <p className="text-[13px] text-muted sm:text-[13.5px]">
          Have an account?{' '}
          <Link href="/login" className="link font-medium">
            Sign in
          </Link>
        </p>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
        <div className="w-full max-w-xl text-left">
          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-fg sm:text-[30px]">
            Set up your clinic
          </h1>
          <p className="mt-1 text-[13.5px] text-muted sm:text-[15px]">
            14 days free on any plan. No card needed. Switch plans anytime.
          </p>
        </div>

        {/* Mobile Plan Indicator badge */}
        <div className="mt-4 flex w-full items-center justify-between rounded-xl border border-line bg-surface-2/80 px-4 py-2.5 text-[13px] lg:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted">Selected plan:</span>
            <strong className="font-semibold text-fg truncate">{plan.shortName}</strong>
            <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[11px] font-medium text-brand">
              {planTier === 'ENTERPRISE'
                ? 'Custom'
                : planTier === 'CLINIC' || planTier === 'GROWTH'
                  ? 'Price to be disclosed'
                  : planTier === 'SOLO'
                    ? '₹249/mo · Limited time offer'
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

        <form
          onSubmit={submit}
          className="mt-6 grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]"
        >
          <div className="card flex w-full flex-col gap-6 p-4 sm:p-7 shadow-sm text-left">
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

            <fieldset className="border-0 p-0 m-0 w-full min-w-0 text-left">
              <legend className="mb-3 text-[14px] font-semibold text-fg">Clinic details</legend>
              <div className="flex w-full flex-col gap-4">
                <div className="field w-full">
                  <label htmlFor="reg-clinic" className="label">
                    Clinic name
                  </label>
                  <input
                    id="reg-clinic"
                    required
                    autoComplete="organization"
                    className="input h-11 w-full"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="e.g. Malabar Care Polyclinic"
                  />
                </div>
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="field w-full">
                    <label htmlFor="reg-doctor" className="label">
                      Your name
                    </label>
                    <input
                      id="reg-doctor"
                      required
                      autoComplete="name"
                      className="input h-11 w-full"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="Dr. Anjali Menon"
                    />
                  </div>
                  <div className="field w-full">
                    <label htmlFor="reg-specialty" className="label">
                      Specialty
                    </label>
                    <input
                      id="reg-specialty"
                      className="input h-11 w-full"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. General Medicine"
                    />
                  </div>
                  <div className="field w-full">
                    <label htmlFor="reg-phone" className="label">
                      Mobile <span className="font-normal text-muted">(optional)</span>
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className="input h-11 w-full tnum"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                    />
                  </div>
                  <div className="field w-full">
                    <label htmlFor="reg-fee" className="label">
                      Consultation fee
                    </label>
                    <div className="relative w-full">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium select-none">
                        ₹
                      </span>
                      <input
                        id="reg-fee"
                        inputMode="numeric"
                        className="input h-11 w-full pl-8 tnum"
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

            <fieldset className="border-0 p-0 m-0 w-full min-w-0 text-left">
              <legend className="mb-3 text-[14px] font-semibold text-fg">Sign-in credentials</legend>
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="field w-full">
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
                    className="input h-11 w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@clinic.in"
                  />
                </div>
                <div className="field w-full">
                  <label htmlFor="reg-password" className="label">
                    Password
                  </label>
                  <div className="relative w-full">
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className="input h-11 w-full pr-11"
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

          <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-6 text-left">
            <fieldset id="plan-selection" className="card w-full overflow-hidden border border-line bg-surface text-left">
              <legend className="sr-only">Choose a plan</legend>
              <div className="border-b border-line bg-surface-2/60 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between">
                <span className="text-[13.5px] sm:text-[14px] font-semibold text-fg">Choose your plan</span>
                <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                  14-day trial
                </span>
              </div>
              <ul className="list w-full">
                {PLAN_ORDER.map((tier) => {
                  const p = PLAN_DEFAULTS[tier];
                  const selected = planTier === tier;
                  return (
                    <li key={tier} className="w-full">
                      <label
                        className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 sm:px-5 transition-colors ${
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
                        <div className="min-w-0 flex-1 text-left">
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
                          {tier === 'SOLO' ? (
                            <div>
                              <span className="inline-block rounded bg-brand-softer px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                Limited time offer
                              </span>
                              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                                <span className="text-[11px] text-muted line-through">₹299</span>
                                <span className="text-[13px] font-bold text-fg">₹249</span>
                                <span className="text-[10.5px] text-muted">/mo</span>
                              </div>
                              <span className="block text-[10px] text-muted">₹349 monthly</span>
                            </div>
                          ) : (
                            <span className="text-[12.5px] font-semibold text-fg">
                              {tier === 'ENTERPRISE'
                                ? 'Custom'
                                : tier === 'CLINIC' || tier === 'GROWTH'
                                  ? 'Price to be disclosed'
                                  : p.monthlyPriceInr === 0
                                    ? 'Free'
                                    : `₹${p.monthlyPriceInr.toLocaleString('en-IN')}`}
                            </span>
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
              className="btn btn-primary btn-lg h-12 w-full text-[15px] font-semibold shadow-sm"
            >
              {submitting ? 'Creating your workspace…' : 'Start 14-day free trial'}
            </button>

            <p className="text-center text-[11.5px] text-muted">
              No card required · Instant access · Cancel anytime
            </p>
            <p className="text-center text-[11px] text-muted">
              By signing up, you agree to our{' '}
              <Link href="/privacy-policy" target="_blank" className="underline hover:text-fg">
                Privacy Policy
              </Link>
              .
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}
