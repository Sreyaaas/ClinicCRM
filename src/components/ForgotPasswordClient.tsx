'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandLogo } from '@/components/Brand';
import { IconAlert, IconArrowRight, IconCheck, IconMessage } from '@/components/Icons';

export function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '919400000000';
  const waMessage = email
    ? `Hi Nadi Support, I need help resetting the password for my clinic account (${email}).`
    : `Hi Nadi Support, I need help resetting the password for my clinic account.`;
  const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(waMessage)}`;

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
        setError(data.error || 'Could not send reset link. Please try again or use WhatsApp below.');
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError('Network error. Please check your connection or contact WhatsApp support.');
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

      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">
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
              <div className="mt-6 rounded-lg bg-surface-2 p-3 text-[12.5px] text-muted w-full text-left">
                Link expires in <strong>15 minutes</strong>. Don’t see it? Check your spam folder.
              </div>

              {/* Instant WhatsApp fallback if email isn't received */}
              <div className="mt-5 w-full rounded-xl border border-line bg-surface-2/70 p-4 text-left">
                <p className="text-[13px] font-semibold text-fg">Didn’t receive the email?</p>
                <p className="mt-0.5 text-[12px] text-muted">
                  Email verification is in Beta. Get your password reset instantly via verified WhatsApp support:
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
                >
                  <IconMessage className="h-4 w-4" />
                  Chat on WhatsApp &rarr;
                </a>
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
                  Try another email
                </button>
                <Link href="/login" className="btn btn-ghost w-full">
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Beta Stage
                </span>
                <span className="text-[12px] text-muted">Instant assistance</span>
              </div>

              <h1 className="text-[24px] font-semibold tracking-tight text-fg">Reset password</h1>
              <p className="mt-1.5 text-[14px] text-muted leading-relaxed">
                Choose between instant WhatsApp concierge verification or email reset link.
              </p>

              {/* Instant WhatsApp Reset Card (Primary until custom domain is linked) */}
              <div className="mt-5 rounded-xl border border-line bg-surface-2/80 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
                    <IconMessage className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-fg">Instant WhatsApp Reset</p>
                    <p className="mt-0.5 text-[12px] text-muted leading-normal">
                      Connect with our clinic support team to verify your identity and restore access in 2 minutes.
                    </p>
                  </div>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#20bd5a]"
                >
                  <IconMessage className="h-4 w-4" />
                  Reset via WhatsApp Concierge
                </a>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">
                  Or receive reset email
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>

              {error && (
                <div role="alert" className="alert alert-danger mb-4">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="flex flex-col gap-4">
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
                  className="btn btn-secondary h-11 w-full font-semibold mt-1"
                >
                  {loading ? 'Sending email…' : 'Send email reset link'}
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
