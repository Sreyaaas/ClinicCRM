import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ApiError, handleApiError, requireApiUser, requirePlanFeature } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/expenses/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'expensesTracker');
    const { id } = await ctx.params;

    const existing = await prisma.expense.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, 'Expense not found.', 'NOT_FOUND');

    await prisma.expense.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
