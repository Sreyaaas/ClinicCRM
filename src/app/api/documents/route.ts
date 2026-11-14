import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { assertRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { isAllowedDocumentMime } from '@/lib/storage/router';

const createDocumentSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable().optional(),
  docType: z.enum([
    'PAPER_SLIP',
    'BLOOD_REPORT',
    'IMAGING_SCAN',
    'ECG',
    'DISCHARGE_SUMMARY',
    'EXTERNAL_RX',
    'OTHER',
  ]),
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(500).nullable().optional(),
  reportDate: z.string().trim().optional(),
  storageProvider: z.enum(['b2', 'local']),
  storageKey: z.string().trim().min(10).max(400),
  originalFilename: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.number().int().min(1).max(6 * 1024 * 1024),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    assertRateLimit(request, {
      action: 'create_document',
      limit: 40,
      windowMs: 5 * 60 * 1000,
      customKey: user.clinicId,
    });
    const body = await parseJsonBody(request, createDocumentSchema);

    if (!isAllowedDocumentMime(body.mimeType)) {
      throw new ApiError(400, 'Unsupported document MIME type.', 'UNSUPPORTED_MIME');
    }

    const expectedPrefix = `clinics/${user.clinicId}/patients/${body.patientId}/`;
    if (!body.storageKey.startsWith(expectedPrefix)) {
      throw new ApiError(403, 'Storage key does not match your clinic/patient scope.', 'INVALID_KEY');
    }

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: user.clinicId },
      select: { id: true },
    });
    if (!patient) {
      throw new ApiError(404, 'Patient not found.', 'PATIENT_NOT_FOUND');
    }

    if (body.visitId) {
      const visit = await prisma.visit.findFirst({
        where: { id: body.visitId, clinicId: user.clinicId, patientId: patient.id },
        select: { id: true },
      });
      if (!visit) {
        throw new ApiError(404, 'Linked visit not found for this patient.', 'VISIT_NOT_FOUND');
      }
    }

    const parsedDate =
      body.reportDate && body.reportDate.trim() !== ''
        ? new Date(`${body.reportDate}T12:00:00.000+05:30`)
        : new Date();

    if (Number.isNaN(parsedDate.getTime())) {
      throw new ApiError(400, 'Invalid report date.', 'INVALID_DATE');
    }

    const usageAgg = await prisma.patientDocument.aggregate({
      where: { clinicId: user.clinicId },
      _sum: { sizeBytes: true },
    });
    const usedBytes = usageAgg._sum.sizeBytes ?? 0;
    const maxBytes = user.clinic.maxStorageMb * 1024 * 1024;
    if (usedBytes + body.sizeBytes > maxBytes) {
      throw new ApiError(
        403,
        `Clinic storage quota (${user.clinic.maxStorageMb} MB) exceeded. Upgrade your plan in Settings.`,
        'STORAGE_QUOTA_EXCEEDED'
      );
    }

    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.patientDocument.create({
        data: {
          clinicId: user.clinicId,
          patientId: patient.id,
          visitId: body.visitId ?? null,
          uploadedByUserId: user.id,
          docType: body.docType,
          title: body.title,
          notes: body.notes || null,
          reportDate: parsedDate,
          storageProvider: body.storageProvider,
          storageKey: body.storageKey,
          originalFilename: body.originalFilename,
          mimeType: body.mimeType,
          sizeBytes: body.sizeBytes,
        },
        include: {
          uploadedBy: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.patient.update({
        where: { id: patient.id },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
