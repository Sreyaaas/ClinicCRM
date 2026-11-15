import { NextResponse } from 'next/server';
import { ApiError, handleApiError, requireApiUser } from '@/lib/api';
import { assertDemoStorageAllowed } from '@/lib/demo-restriction';
import { verifyLocalUploadToken, writeLocalStorageObject } from '@/lib/storage/local-adapter';
import { isAllowedDocumentMime } from '@/lib/storage/router';

export async function PUT(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    assertDemoStorageAllowed(user);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') ?? '';
    const mime = searchParams.get('mime') ?? '';
    const exp = Number(searchParams.get('exp') ?? '0');
    const sig = searchParams.get('sig') ?? '';

    if (!key.startsWith(`clinics/${user.clinicId}/`)) {
      throw new ApiError(403, 'Upload key outside clinic scope.', 'FORBIDDEN');
    }

    if (!isAllowedDocumentMime(mime)) {
      throw new ApiError(400, 'Unsupported MIME type.', 'UNSUPPORTED_MIME');
    }

    if (!verifyLocalUploadToken(key, mime, exp, sig)) {
      throw new ApiError(403, 'Invalid or expired upload signature.', 'INVALID_SIGNATURE');
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 12 * 1024 * 1024) {
      throw new ApiError(400, 'Invalid file size.', 'INVALID_SIZE');
    }

    await writeLocalStorageObject(key, buffer);
    return NextResponse.json({ ok: true, key, sizeBytes: buffer.byteLength });
  } catch (error) {
    return handleApiError(error);
  }
}
