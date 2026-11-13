'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BRAND_NAME, BrandLogo } from '@/components/Brand';
import { IconAlert, IconArrowRight, IconCheck, IconEye, IconEyeOff } from '@/components/Icons';
import { Avatar } from '@/components/ui';

export interface DemoAccount {
  email: string;
  name: string;
  clinicName: string;
  plan: string;
  role: string;
}

export function LoginClient({ demos }: { demos: DemoAccount[] }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function signIn(nextEmail: string, nextPassword: string, key: string) {
    setError(null);
    setSubmitting(key);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Incorrect email or password.');
        setSubmitting(null);
        return;
      }
      router.replace('/app');
    } catch {
      setError('Network error. Check your connection and try again.');
      setSubmitting(null);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ───── Form ───── */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <BrandLogo />
          <Link href="/" className="text-[14px] font-medium text-muted hover:text-fg">
            ← Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-14">
          <h1 className="text-[40px] font-bold leading-[1.02] tracking-[-0.045em] sm:text-[48px]">
            Welcome
            <br />
            <span className="text-[var(--ghost)]">back.</span>
          </h1>
          <p className="mt-4 text-[16px] text-muted">Sign in to your clinic on {BRAND_NAME}.</p>

          {error && (
            <div role="alert" className="alert alert-danger mt-6">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email, password, 'form');
            }}
            className="mt-8 flex flex-col gap-4"
          >
            <div className="field">
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="input h-12 text-[15px]"
                placeholder="you@clinic.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="login-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input h-12 pr-12 text-[15px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-fg"
                >
                  {show ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={submitting !== null} className="btn btn-primary mt-2 h-[52px] w-full text-[15.5px] font-semibold">
              {submitting === 'form' ? 'Signing in…' : 'Sign in'}
              {submitting !== 'form' && <IconArrowRight />}
            </button>
          </form>

          <p className="mt-8 text-[14.5px] text-muted">
            New to {BRAND_NAME}?{' '}
            <Link href="/register" className="font-semibold text-fg underline decoration-[var(--accent)] decoration-2 underline-offset-4">
              Start your 14-day free trial
            </Link>
          </p>
        </div>
      </main>

      {/* ───── Brand side ───── */}
      <aside className="relative overflow-hidden bg-[color-mix(in_oklab,var(--brand)_9%,var(--bg))] px-5 py-12 sm:px-10 lg:py-6">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--brand)_22%,transparent),transparent_65%)]" />
        <div className="relative mx-auto flex h-full w-full max-w-[460px] flex-col justify-center">
          {demos.length > 0 ? (
            <>
              <p className="text-[14px] font-semibold text-[var(--accent)]">Try it first</p>
              <h2 className="mt-2 text-[32px] font-bold leading-[1.05] tracking-[-0.04em]">Open a demo clinic in one tap.</h2>
              <p className="mt-3 text-[15px] text-muted">Each account shows a different plan, with real sample patients.</p>
              <ul className="mt-7 flex flex-col gap-2">
                {demos.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      disabled={submitting !== null}
                      onClick={() => void signIn(a.email, 'pilot123', a.email)}
                      className="group flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop disabled:opacity-60"
                    >
                      <Avatar name={a.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{a.clinicName}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {a.name} · {a.role}
                        </span>
                      </span>
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-medium text-muted">{a.plan}</span>
                      <span className="text-subtle transition-transform group-hover:translate-x-0.5">
                        {submitting === a.email ? <span className="text-[12px]">…</span> : <IconArrowRight className="h-4 w-4" />}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-[36px] font-bold leading-[1.05] tracking-[-0.04em]">Your whole clinic, one sign-in away.</h2>
              <ul className="mt-8 flex flex-col gap-3 text-[15.5px]">
                {['Patient history in 2 seconds', 'Token queue and online booking', 'UPI bills and daily cash tally', 'WhatsApp reminders in Malayalam'].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <IconCheck className="h-5 w-5 text-[var(--accent)]" /> {t}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
