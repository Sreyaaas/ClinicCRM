import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

const updateBillingSchema = z.object({
  amount: z.number().int().min(0).max(100000).optional(),
  discount: z.number().int().min(0).max(100000).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/billing/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'billing');
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, updateBillingSchema);

    const existing = await prisma.billingRecord.findFirst({
      where: { id, clinicId: user.clinicId },
    });
    if (!existing) {
      throw new ApiError(404, 'Billing record not found.', 'BILLING_NOT_FOUND');
    }

    const amount = body.amount ?? existing.amount;
    const discount = body.discount ?? existing.discount;
    const taxable = Math.max(0, amount - discount);
    const gstAmount = Math.round((taxable * existing.gstRatePercent) / 100);
    const netAmount = taxable + gstAmount;
    const paymentStatus = body.paymentStatus ?? existing.paymentStatus;

    const updated = await prisma.billingRecord.update({
      where: { id: existing.id },
      data: {
        amount,
        discount,
        gstAmount,
        netAmount,
        paymentStatus,
        paymentMode:
          paymentStatus === 'UNPAID'
            ? null
            : (body.paymentMode ?? existing.paymentMode ?? 'CASH'),
        notes: body.notes !== undefined ? body.notes : existing.notes,
        collectedByUserId:
          paymentStatus === 'UNPAID' ? null : (existing.collectedByUserId ?? user.id),
        collectedAt: paymentStatus === 'UNPAID' ? null : (existing.collectedAt ?? new Date()),
      },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'BILL_UPDATED',
      entityType: 'BillingRecord',
      entityId: updated.id,
      summary: `Updated ${existing.invoiceNumber ?? existing.id}: ${updated.paymentStatus} (₹${updated.netAmount})`,
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
