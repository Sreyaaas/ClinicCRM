import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser, requirePlanFeature } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireApiUser({ roles: ['OWNER_DOCTOR', 'DOCTOR'] });
    requirePlanFeature(user, 'auditLogs');

    const logs = await prisma.auditLog.findMany({
      where: { clinicId: user.clinicId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return handleApiError(error);
  }
}
