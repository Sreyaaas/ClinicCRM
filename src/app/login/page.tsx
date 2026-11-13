import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DEFAULT_PALETTE } from '@/components/landing/palettes';
import { LoginClient, type DemoAccount } from '@/components/LoginClient';
import { getPlanDefinition } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Sign in' };

const DEMO_EMAILS = [
  'dr.arun@solo.in',
  'owner@malabarclinic.in',
  'staff@malabarclinic.in',
  'growth@keralacare.in',
  'enterprise@keralacare.in',
];

const ROLE_LABEL: Record<string, string> = { OWNER_DOCTOR: 'Owner', DOCTOR: 'Doctor', STAFF: 'Front desk' };

async function LoginLoader() {
  let demos: DemoAccount[] = [];
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_USERS !== 'false') {
    try {
      // Read real names so the sign-in page always matches what's inside the app
      const users = await prisma.user.findMany({
        where: { email: { in: DEMO_EMAILS }, isActive: true },
        select: { email: true, name: true, role: true, clinic: { select: { name: true, planTier: true } } },
      });
      demos = DEMO_EMAILS.flatMap((email) => {
        const u = users.find((x) => x.email === email);
        return u
          ? [
              {
                email,
                name: u.name,
                clinicName: u.clinic.name,
                plan: getPlanDefinition(u.clinic.planTier).shortName,
                role: ROLE_LABEL[u.role] ?? u.role,
              },
            ]
          : [];
      });
    } catch {
      demos = [];
    }
  }
  return <LoginClient demos={demos} />;
}

export default function LoginPage() {
  return (
    <div data-landing style={DEFAULT_PALETTE.vars as React.CSSProperties} className="theme-light min-h-dvh">
      <Suspense fallback={<div className="min-h-dvh" />}>
        <LoginLoader />
      </Suspense>
    </div>
  );
}
