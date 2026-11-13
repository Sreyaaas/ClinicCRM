import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { getIstDayString } from '@/lib/date';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireApiUser({ roles: ['OWNER_DOCTOR'] });

    const [clinic, branches, conditionTemplates, patients] = await Promise.all([
      prisma.clinic.findUnique({
        where: { id: user.clinicId },
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          address: true,
          upiId: true,
          gstin: true,
          planTier: true,
        },
      }),
      prisma.branch.findMany({ where: { clinicId: user.clinicId } }),
      prisma.conditionTemplate.findMany({ where: { clinicId: user.clinicId } }),
      prisma.patient.findMany({
        where: { clinicId: user.clinicId },
        orderBy: { patientCode: 'asc' },
        include: {
          visits: {
            orderBy: { visitedAt: 'desc' },
            include: {
              doctor: { select: { name: true, specialty: true, registrationNo: true } },
              prescriptions: { orderBy: { sortOrder: 'asc' } },
            },
          },
          documents: {
            orderBy: { reportDate: 'desc' },
            select: {
              id: true,
              docType: true,
              title: true,
              notes: true,
              reportDate: true,
              storageProvider: true,
              storageKey: true,
              originalFilename: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
          appointments: {
            orderBy: { scheduledAt: 'desc' },
          },
          clinicalOrders: {
            orderBy: { createdAt: 'desc' },
          },
          billingRecords: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'CLINIC_DATA_EXPORTED',
      entityType: 'Clinic',
      entityId: user.clinicId,
      summary: `Downloaded full JSON clinic backup (${patients.length} patients)`,
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      clinic,
      branches,
      conditionTemplates,
      patientCount: patients.length,
      patients,
    };

    const day = getIstDayString();
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="clinic-backup-${day}.json"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
