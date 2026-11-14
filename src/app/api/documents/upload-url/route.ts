import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { assertRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { createUploadTarget, isAllowedDocumentMime } from '@/lib/storage/router';

const uploadUrlSchema = z.object({
  patientId: z.string().uuid(),
  docType: z
    .enum([
      'PAPER_SLIP',
      'BLOOD_REPORT',
      'IMAGING_SCAN',
      'ECG',
      'DISCHARGE_SUMMARY',
      'EXTERNAL_RX',
      'OTHER',
    ])
    .default('BLOOD_REPORT'),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.number().int().min(1).max(6 * 1024 * 1024),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    assertRateLimit(request, {
      action: 'upload_url',
      limit: 30,
      windowMs: 5 * 60 * 1000,
      customKey: user.clinicId,
    });
    const body = await parseJsonBody(request, uploadUrlSchema);

    if (!isAllowedDocumentMime(body.mimeType)) {
      throw new ApiError(
        400,
        'Unsupported file type. Upload JPG, PNG, WebP, or PDF.',
        'UNSUPPORTED_MIME'
      );
    }

    const [patient, usageAgg] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: body.patientId, clinicId: user.clinicId },
        select: { id: true },
      }),
      prisma.patientDocument.aggregate({
        where: { clinicId: user.clinicId },
        _sum: { sizeBytes: true },
      }),
    ]);

    if (!patient) {
      throw new ApiError(404, 'Patient not found in your clinic.', 'PATIENT_NOT_FOUND');
    }

    const usedBytes = usageAgg._sum.sizeBytes ?? 0;
    const maxBytes = user.clinic.maxStorageMb * 1024 * 1024;
    if (usedBytes + body.sizeBytes > maxBytes) {
      throw new ApiError(
        403,
        `Clinic storage quota (${user.clinic.maxStorageMb} MB) exceeded. Upgrade your plan in Settings.`,
        'STORAGE_QUOTA_EXCEEDED'
      );
    }

    const target = await createUploadTarget({
      clinicId: user.clinicId,
      patientId: patient.id,
      docType: body.docType,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
    });

    return NextResponse.json(target);
  } catch (error) {
    return handleApiError(error);
  }
}
