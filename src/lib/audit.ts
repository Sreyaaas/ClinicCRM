import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export async function recordAuditLog(params: {
  clinicId: string;
  actorUserId?: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: params.clinicId,
        actorUserId: params.actorUserId ?? null,
        actorName: params.actorName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.warn('[AUDIT_LOG_WARN]', err);
  }
}
