import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser, requirePlanFeature } from '@/lib/api';
import { formatIstDate, getIstDayString } from '@/lib/date';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'analyticsMis');

    const { searchParams } = new URL(request.url);
    const daysParam = Number.parseInt(searchParams.get('days') ?? '30', 10);
    const rangeDays = daysParam === 7 || daysParam === 90 ? daysParam : 30;
    const format = searchParams.get('format');

    const endDay = getIstDayString();
    const endDt = new Date(`${endDay}T23:59:59.999+05:30`);
    const startDt = new Date(endDt.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
    startDt.setUTCHours(0, 0, 0, 0);

    const [bills, visits, newPatientsCount, orders, expenses] = await Promise.all([
      prisma.billingRecord.findMany({
        where: { clinicId: user.clinicId, createdAt: { gte: startDt, lte: endDt } },
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { select: { id: true, name: true } },
          patient: { select: { id: true, name: true, patientCode: true } },
        },
      }),
      prisma.visit.findMany({
        where: { clinicId: user.clinicId, visitedAt: { gte: startDt, lte: endDt } },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          diagnosis: true,
          visitedAt: true,
        },
      }),
      prisma.patient.count({
        where: { clinicId: user.clinicId, createdAt: { gte: startDt, lte: endDt } },
      }),
      prisma.clinicalOrder.findMany({
        where: { clinicId: user.clinicId, createdAt: { gte: startDt, lte: endDt } },
        select: { orderType: true, status: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { clinicId: user.clinicId, spentOn: { gte: startDt, lte: endDt } },
        select: { amount: true, category: true },
      }),
    ]);

    if (format === 'csv') {
      const escapeCsv = (val: string | number | null | undefined) => {
        const str = String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      };
      const lines = [
        ['Invoice', 'Date', 'Patient Code', 'Patient Name', 'Doctor', 'Subtotal', 'Discount', 'GST', 'Net Amount', 'Status', 'Mode'].join(','),
        ...bills.map((b) =>
          [
            escapeCsv(b.invoiceNumber ?? b.id.slice(0, 8)),
            escapeCsv(formatIstDate(b.createdAt)),
            escapeCsv(b.patient.patientCode),
            escapeCsv(b.patient.name),
            escapeCsv(b.doctor.name),
            b.amount,
            b.discount,
            b.gstAmount,
            b.netAmount,
            b.paymentStatus,
            escapeCsv(b.paymentMode ?? ''),
          ].join(',')
        ),
      ];
      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="clinic-accounts-${rangeDays}d-${endDay}.csv"`,
        },
      });
    }

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
      if (v.diagnosis && v.diagnosis.trim()) {
        const cleanDiag = v.diagnosis.trim();
        diagnosisCounts.set(cleanDiag, (diagnosisCounts.get(cleanDiag) ?? 0) + 1);
      }
    }

    const uniqueVisitedPatients = patientVisitCounts.size;
    const revisitPatients = Array.from(patientVisitCounts.values()).filter((c) => c > 1).length;
    const revisitRatePercent =
      uniqueVisitedPatients > 0 ? Math.round((revisitPatients / uniqueVisitedPatients) * 100) : 0;

    return NextResponse.json({
      rangeDays,
      kpis: {
        collectedRevenue,
        pendingDues,
        totalExpenses,
        netProfit: collectedRevenue - totalExpenses,
        totalGst,
        visitCount: visits.length,
        newPatientsCount,
        revisitRatePercent,
        ordersCount: orders.length,
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}
