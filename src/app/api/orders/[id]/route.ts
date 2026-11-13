import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const patchOrderSchema = z.object({
  status: z.enum(['ORDERED', 'IN_PROGRESS', 'READY', 'DISPENSED', 'CANCELLED']),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/orders/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'labAndPharmacy');
    const { id } = await ctx.params;
    const body = await parseJsonBody(request, patchOrderSchema);

    const existing = await prisma.clinicalOrder.findFirst({
      where: { id, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!existing) throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND');

    const order = await prisma.clinicalOrder.update({
      where: { id: existing.id },
      data: { status: body.status },
    });

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
