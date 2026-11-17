'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BrandLogo } from '@/components/Brand';
import { IconAlert, IconArrowRight, IconCheck, IconEye, IconEyeOff } from '@/components/Icons';

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to reset password. The link may have expired.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch {
      setError('Network error. Please try again.');
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
          {!token ? (
            <div className="flex flex-col items-center text-center py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger mb-4">
                <IconAlert className="h-6 w-6" />
              </div>
              <h1 className="text-[20px] font-semibold text-fg">Invalid reset link</h1>
              <p className="mt-2 text-[14px] text-muted">
                The password reset link is missing a valid security token.
              </p>
              <Link href="/forgot-password" className="btn btn-primary mt-6 w-full">
                Request a new link
              </Link>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center text-center py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-light text-success mb-4">
                <IconCheck className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight text-fg">Password updated!</h1>
              <p className="mt-2 text-[14px] text-muted leading-relaxed">
                Your clinic password has been successfully changed. Redirecting to sign in…
              </p>
              <Link href="/login" className="btn btn-primary mt-6 w-full">
                Sign in now &rarr;
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-[24px] font-semibold tracking-tight text-fg">Set new password</h1>
              <p className="mt-1.5 text-[14px] text-muted">
                Choose a strong password for your clinic account.
              </p>

              {error && (
                <div role="alert" className="alert alert-danger mt-5">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
                <div className="field">
                  <label htmlFor="new-password" className="label">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className="input h-11 pr-11"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle hover:text-fg"
                    >
                      {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="confirm-password" className="label">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="input h-11"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary h-11 w-full font-semibold mt-2"
                >
                  {loading ? 'Updating password…' : 'Update password'}
                  {!loading && <IconArrowRight />}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-line text-center text-[13px] text-muted">
                Need a new link?{' '}
                <Link href="/forgot-password" className="font-medium text-brand hover:underline">
                  Resend reset email
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
