import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { getIstDayBounds, getIstDayString } from '@/lib/date';
import { prisma } from '@/lib/prisma';

const createExpenseSchema = z.object({
  category: z.enum(['SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'PHARMACY_STOCK', 'OTHER']).default('OTHER'),
  title: z.string().trim().min(2).max(120),
  amount: z.number().int().min(1).max(1000000),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']).default('CASH'),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(240).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'expensesTracker');

    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day') ?? getIstDayString();
    const { start, end } = getIstDayBounds(day);

    const expenses = await prisma.expense.findMany({
      where: {
        clinicId: user.clinicId,
        spentOn: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    return NextResponse.json({ day, expenses, totalExpenses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'expensesTracker');

    const body = await parseJsonBody(request, createExpenseSchema);
    const day = body.day ?? getIstDayString();
    const spentOn = new Date(`${day}T12:00:00.000+05:30`);

    const expense = await prisma.expense.create({
      data: {
        clinicId: user.clinicId,
        branchId: user.activeBranchId ?? null,
        recordedById: user.id,
        category: body.category,
        title: body.title,
        amount: body.amount,
        paymentMode: body.paymentMode,
        spentOn,
        notes: body.notes || null,
      },
      include: {
        recordedBy: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'EXPENSE_LOGGED',
      entityType: 'Expense',
      entityId: expense.id,
      summary: `Logged expense "${expense.title}" (₹${expense.amount})`,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
