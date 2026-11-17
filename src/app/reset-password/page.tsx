import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';
import { ResetPasswordClient } from '@/components/ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Set new password',
  description: 'Reset your clinic account password',
};

export default function ResetPasswordPage() {
  return (
    <div data-landing style={DEFAULT_PALETTE.vars as React.CSSProperties} className="theme-light min-h-dvh">
      <Suspense fallback={<div className="min-h-dvh" />}>
        <ResetPasswordClient />
      </Suspense>
    </div>
  );
}
