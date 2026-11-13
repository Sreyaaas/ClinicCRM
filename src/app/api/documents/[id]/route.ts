import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ApiError, handleApiError, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { deleteStoredDocument } from '@/lib/storage/router';

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/documents/[id]'>) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    const { id } = await ctx.params;

    const doc = await prisma.patientDocument.findFirst({
      where: { id, clinicId: user.clinicId },
    });
    if (!doc) {
      throw new ApiError(404, 'Document not found.', 'DOCUMENT_NOT_FOUND');
    }

    if (!isDoctorRole(user.role) && doc.uploadedByUserId !== user.id) {
      throw new ApiError(
        403,
        'Only doctors or the uploader can delete this document.',
        'FORBIDDEN'
      );
    }

    await deleteStoredDocument({
      storageProvider: doc.storageProvider,
      storageKey: doc.storageKey,
    });

    await prisma.patientDocument.delete({ where: { id: doc.id } });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'DOCUMENT_DELETED',
      entityType: 'PatientDocument',
      entityId: doc.id,
      summary: `Deleted ${doc.docType} "${doc.title}" (${doc.originalFilename})`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
