'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandLogo } from '@/components/Brand';
import { IconAlert, IconArrowRight, IconCheck } from '@/components/Icons';

export function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Could not send reset link. Please try again.');
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError('Network error. Please check your connection.');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-10">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between">
        <BrandLogo />
        <Link href="/login" className="text-[14px] font-medium text-muted hover:text-fg">
          &larr; Back to sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
        <div className="card flex flex-col p-6 sm:p-8 shadow-sm">
          {sent ? (
            <div className="flex flex-col items-center text-center py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-light text-success mb-4">
                <IconCheck className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight text-fg">Check your email</h1>
              <p className="mt-2 text-[14px] text-muted leading-relaxed">
                If an account exists for <strong className="font-semibold text-fg">{email}</strong>, we have sent a secure link to reset your password.
              </p>
              <div className="mt-6 rounded-lg bg-surface-2 p-3 text-[12.5px] text-muted w-full">
                Link expires in <strong>15 minutes</strong>. Don’t see it? Check your spam folder.
              </div>
              <div className="mt-6 flex flex-col gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail('');
                  }}
                  className="btn btn-secondary w-full"
                >
                  Send to another email
                </button>
                <Link href="/login" className="btn btn-ghost w-full">
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-[24px] font-semibold tracking-tight text-fg">Forgot password?</h1>
              <p className="mt-1.5 text-[14px] text-muted">
                Enter your clinic email and we’ll send you a secure link to reset your password.
              </p>

              {error && (
                <div role="alert" className="alert alert-danger mt-5">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <div className="field">
                  <label htmlFor="fp-email" className="label">
                    Email address
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    className="input h-11"
                    placeholder="doctor@clinic.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary h-11 w-full font-semibold mt-2"
                >
                  {loading ? 'Sending link…' : 'Send reset link'}
                  {!loading && <IconArrowRight />}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-line text-center text-[13px] text-muted">
                Remember your password?{' '}
                <Link href="/login" className="font-medium text-brand hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
