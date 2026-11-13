import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ApiError, handleApiError, requireApiUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { readLocalStorageObject } from '@/lib/storage/local-adapter';
import { createReadUrlForDocument } from '@/lib/storage/router';

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/documents/[id]/file'>) {
  try {
    const user = await requireApiUser();
    const { id } = await ctx.params;

    const doc = await prisma.patientDocument.findFirst({
      where: { id, clinicId: user.clinicId },
    });

    if (!doc) {
      throw new ApiError(404, 'Document not found.', 'DOCUMENT_NOT_FOUND');
    }

    if (doc.storageProvider === 'local') {
      const fileBuffer = await readLocalStorageObject(doc.storageKey);
      const safeName = doc.originalFilename.replace(/["\r\n]/g, '');
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': doc.mimeType,
          'Content-Disposition': `inline; filename="${safeName}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    const signedUrl = await createReadUrlForDocument({
      storageProvider: doc.storageProvider,
      storageKey: doc.storageKey,
      filename: doc.originalFilename,
    });

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
