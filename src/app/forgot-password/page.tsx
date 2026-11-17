import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';
import { ForgotPasswordClient } from '@/components/ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Reset your clinic account password',
};

export default function ForgotPasswordPage() {
  return (
    <div data-landing style={DEFAULT_PALETTE.vars as React.CSSProperties} className="theme-light min-h-dvh">
      <Suspense fallback={<div className="min-h-dvh" />}>
        <ForgotPasswordClient />
      </Suspense>
    </div>
  );
}
