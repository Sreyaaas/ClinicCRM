import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/PageSkeleton';
import { AnalyticsClient, type AnalyticsPayload } from '@/components/AnalyticsClient';
import { FeatureLockedCard } from '@/components/PlanBadge';
import { requireSessionUser } from '@/lib/auth';
import { getIstDayString } from '@/lib/date';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

async function AnalyticsLoader() {
  const user = await requireSessionUser();
  const features = getPlanFeatures(user.clinic.planTier);

  if (!features.analyticsMis) {
    return (
      <FeatureLockedCard
        feature="analyticsMis"
        currentTier={user.clinic.planTier}
        title="Monthly Accounts, Net Profit & CSV Reports"
        description="See how much your clinic collected, subtract expenses to view true net profit, check returning patient count, and download accountant CSV files."
      />
    );
  }

  const endDay = getIstDayString();
  const endDt = new Date(`${endDay}T23:59:59.999+05:30`);
  const startDt = new Date(endDt.getTime() - 29 * 24 * 60 * 60 * 1000);
  startDt.setUTCHours(0, 0, 0, 0);

  const [bills, visits, newPatientsCount, orders, expenses] = await Promise.all([
    prisma.billingRecord.findMany({
      where: { clinicId: user.clinicId, createdAt: { gte: startDt, lte: endDt } },
      include: { doctor: { select: { id: true, name: true } } },
    }),
    prisma.visit.findMany({
      where: { clinicId: user.clinicId, visitedAt: { gte: startDt, lte: endDt } },
      select: { id: true, patientId: true, doctorId: true, diagnosis: true, visitedAt: true },
    }),
    prisma.patient.count({
      where: { clinicId: user.clinicId, createdAt: { gte: startDt, lte: endDt } },
    }),
    prisma.clinicalOrder.count({
      where: { clinicId: user.clinicId, createdAt: { gte: startDt, lte: endDt } },
    }),
    prisma.expense.findMany({
      where: { clinicId: user.clinicId, spentOn: { gte: startDt, lte: endDt } },
      select: { amount: true },
    }),
  ]);

  let collectedRevenue = 0;
  let pendingDues = 0;
  let totalGst = 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const byMode: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, OTHER: 0 };
  const dailyMap = new Map<string, { day: string; collected: number; visits: number }>();
  const docStats = new Map<string, { doctorId: string; doctorName: string; revenue: number; bills: number; visits: number }>();

  for (const b of bills) {
    totalGst += b.gstAmount;
    const dStr = b.createdAt.toISOString().slice(0, 10);
    const dayEntry = dailyMap.get(dStr) ?? { day: dStr, collected: 0, visits: 0 };
    const docEntry = docStats.get(b.doctorId) ?? {
      doctorId: b.doctorId,
      doctorName: b.doctor.name,
      revenue: 0,
      bills: 0,
      visits: 0,
    };
    docEntry.bills += 1;

    if (b.paymentStatus === 'PAID') {
      collectedRevenue += b.netAmount;
      dayEntry.collected += b.netAmount;
      docEntry.revenue += b.netAmount;
      const m = b.paymentMode ?? 'OTHER';
      byMode[m] = (byMode[m] ?? 0) + b.netAmount;
    } else {
      pendingDues += b.netAmount;
    }
    dailyMap.set(dStr, dayEntry);
    docStats.set(b.doctorId, docEntry);
  }

  const patientVisitCounts = new Map<string, number>();
  const diagnosisCounts = new Map<string, number>();
  for (const v of visits) {
    const dStr = v.visitedAt.toISOString().slice(0, 10);
    const dayEntry = dailyMap.get(dStr) ?? { day: dStr, collected: 0, visits: 0 };
    dayEntry.visits += 1;
    dailyMap.set(dStr, dayEntry);
    const docEntry = docStats.get(v.doctorId);
    if (docEntry) docEntry.visits += 1;
    patientVisitCounts.set(v.patientId, (patientVisitCounts.get(v.patientId) ?? 0) + 1);
    if (v.diagnosis?.trim()) {
      const clean = v.diagnosis.trim();
      diagnosisCounts.set(clean, (diagnosisCounts.get(clean) ?? 0) + 1);
    }
  }

  const uniqueVisited = patientVisitCounts.size;
  const revisits = Array.from(patientVisitCounts.values()).filter((n) => n > 1).length;

  const initialData: AnalyticsPayload = {
    rangeDays: 30,
    kpis: {
      collectedRevenue,
      pendingDues,
      totalExpenses,
      netProfit: collectedRevenue - totalExpenses,
      totalGst,
      visitCount: visits.length,
      newPatientsCount,
      revisitRatePercent: uniqueVisited > 0 ? Math.round((revisits / uniqueVisited) * 100) : 0,
      ordersCount: orders,
    },
    byMode,
    byDoctor: Array.from(docStats.values()).sort((a, b) => b.revenue - a.revenue),
    dailySeries: Array.from(dailyMap.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-14),
    topDiagnoses: Array.from(diagnosisCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count })),
  };

  return <AnalyticsClient initialData={initialData} />;
}

export const metadata: Metadata = { title: 'Reports' };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnalyticsLoader />
    </Suspense>
  );
}
