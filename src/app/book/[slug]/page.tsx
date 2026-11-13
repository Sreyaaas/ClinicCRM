import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { PublicBookingClient } from '@/components/PublicBookingClient';
import { getIstDayString } from '@/lib/date';
import { getPlanFeatures, isSubscriptionActive } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { resolveThemeAccent } from '@/lib/themes';

async function BookingLoader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      phone: true,
      address: true,
      workingHours: true,
      slotDurationMin: true,
      enablePublicBooking: true,
      planTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      themePreset: true,
      brandColor: true,
      users: {
        where: { isActive: true, role: { in: ['OWNER_DOCTOR', 'DOCTOR'] } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, specialty: true, consultationFee: true },
      },
    },
  });

  if (!clinic || !isSubscriptionActive(clinic.subscriptionStatus, clinic.trialEndsAt)) {
    notFound();
  }

  const features = getPlanFeatures(clinic.planTier);
  if (!features.publicBooking || !clinic.enablePublicBooking || clinic.users.length === 0) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <div className="card px-6 py-10">
          <h1 className="text-xl font-semibold tracking-[-0.015em]">{clinic.name}</h1>
          <p className="mt-2 text-[14px] text-muted">
            Online booking is currently closed for this clinic. Please call{' '}
            {clinic.phone ?? 'the clinic desk'} directly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PublicBookingClient
      clinic={{
        slug: clinic.slug,
        name: clinic.name,
        phone: clinic.phone,
        address: clinic.address,
        workingHours: clinic.workingHours,
        slotDurationMin: clinic.slotDurationMin,
        brandColor: resolveThemeAccent(clinic),
      }}
      doctors={clinic.users}
      todayIst={getIstDayString()}
    />
  );
}

export const metadata: Metadata = { title: 'Book appointment' };

export default function PublicClinicBookingPage(props: PageProps<'/book/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BookingLoader params={props.params} />
    </Suspense>
  );
}
