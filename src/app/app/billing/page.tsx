import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import {
  BillingClient,
  type BillingRecordItem,
  type BillingSummaryData,
  type ExpenseItem,
} from '@/components/BillingClient';
import { FeatureLockedCard } from '@/components/PlanBadge';
import { requireSessionUser } from '@/lib/auth';
import { getIstDayBounds, getIstDayString } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

async function BillingLoader({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const user = await requireSessionUser();
  const sp = await searchParams;
  const initialAction = sp.action === 'bill' || sp.action === 'expense' ? sp.action : null;
  const features = getPlanFeatures(user.clinic.planTier);

  if (!features.billing) {
    return (
      <FeatureLockedCard
        feature="billing"
        currentTier={user.clinic.planTier}
        title="Fee Collection, UPI QR & Daily Tally"
        description="Track consultation fees, let patients pay with a quick GPay/PhonePe QR code, and see your end-of-day cash tally."
      />
    );
  }

  const day = getIstDayString();
  const { start, end } = getIstDayBounds(day);

  const [records, expenses, doctors] = await Promise.all([
    prisma.billingRecord.findMany({
      where: {
        clinicId: user.clinicId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, patientCode: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
        collectedBy: { select: { id: true, name: true } },
      },
    }),
    features.expensesTracker
      ? prisma.expense.findMany({
          where: {
            clinicId: user.clinicId,
            spentOn: { gte: start, lte: end },
          },
          orderBy: { createdAt: 'desc' },
          include: { recordedBy: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { clinicId: user.clinicId, isActive: true, role: { in: ['OWNER_DOCTOR', 'DOCTOR'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, consultationFee: true },
    }),
  ]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const summary: BillingSummaryData = {
    day,
    totalBilled: 0,
    totalCollected: 0,
    totalUnpaid: 0,
    totalGst: 0,
    totalExpenses,
    netCash: 0,
    byMode: { CASH: 0, UPI: 0, CARD: 0, OTHER: 0 },
    byDoctor: [],
  };

  const docMap = new Map<
    string,
    { doctorId: string; doctorName: string; billCount: number; collected: number; unpaid: number }
  >();

  for (const r of records) {
    summary.totalBilled += r.netAmount;
    summary.totalGst += r.gstAmount;
    const entry = docMap.get(r.doctorId) ?? {
      doctorId: r.doctorId,
      doctorName: r.doctor.name,
      billCount: 0,
      collected: 0,
      unpaid: 0,
    };
    entry.billCount += 1;

    if (r.paymentStatus === 'PAID') {
      summary.totalCollected += r.netAmount;
      entry.collected += r.netAmount;
      const mode = r.paymentMode ?? 'OTHER';
      summary.byMode[mode] += r.netAmount;
    } else {
      summary.totalUnpaid += r.netAmount;
      entry.unpaid += r.netAmount;
    }
    docMap.set(r.doctorId, entry);
  }
  summary.byDoctor = Array.from(docMap.values());
  summary.netCash = summary.totalCollected - totalExpenses;

  const serializedRecords: BillingRecordItem[] = records.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    amount: r.amount,
    discount: r.discount,
    gstRatePercent: r.gstRatePercent,
    gstAmount: r.gstAmount,
    netAmount: r.netAmount,
    paymentStatus: r.paymentStatus,
    paymentMode: r.paymentMode,
    createdAt: r.createdAt.toISOString(),
    patient: r.patient,
    doctor: r.doctor,
    collectedBy: r.collectedBy,
  }));

  const serializedExpenses: ExpenseItem[] = expenses.map((e) => ({
    id: e.id,
    category: e.category,
    title: e.title,
    amount: e.amount,
    paymentMode: e.paymentMode,
    createdAt: e.createdAt.toISOString(),
    recordedBy: e.recordedBy,
  }));

  return (
    <BillingClient
      user={user}
      initialRecords={serializedRecords}
      initialExpenses={serializedExpenses}
      initialSummary={summary}
      doctorOptions={doctors}
      initialAction={initialAction}
    />
  );
}

export const metadata: Metadata = { title: 'Billing' };

export default function BillingPage(props: PageProps<'/app/billing'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BillingLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
