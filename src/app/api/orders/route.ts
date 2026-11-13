import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const createOrderSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().nullable().optional(),
  doctorId: z.string().uuid().optional(),
  orderType: z.enum(['LAB_TEST', 'DISPENSARY']),
  itemName: z.string().trim().min(2).max(160),
  instructions: z.string().trim().max(300).nullable().optional(),
  amount: z.number().int().min(0).max(50000).default(0),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'labAndPharmacy');
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');

    const orders = await prisma.clinicalOrder.findMany({
      where: {
        clinicId: user.clinicId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status: status as 'ORDERED' | 'IN_PROGRESS' | 'READY' | 'DISPENSED' | 'CANCELLED' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'labAndPharmacy');
    const body = await parseJsonBody(request, createOrderSchema);

    const doctorId = body.doctorId ?? (isDoctorRole(user.role) ? user.id : undefined);
    if (!doctorId) {
      throw new ApiError(400, 'Please specify ordering doctor.', 'DOCTOR_REQUIRED');
    }

    const patient = await prisma.patient.findFirst({
      where: { id: body.patientId, clinicId: user.clinicId },
      select: { id: true, name: true },
    });
    if (!patient) throw new ApiError(404, 'Patient not found.', 'PATIENT_NOT_FOUND');

    const order = await prisma.clinicalOrder.create({
      data: {
        clinicId: user.clinicId,
        patientId: patient.id,
        visitId: body.visitId ?? null,
        doctorId,
        orderType: body.orderType,
        itemName: body.itemName,
        instructions: body.instructions || null,
        amount: body.amount,
      },
      include: {
        patient: { select: { id: true, name: true, patientCode: true, phone: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'CLINICAL_ORDER_CREATED',
      entityType: 'ClinicalOrder',
      entityId: order.id,
      summary: `Created ${order.orderType} order "${order.itemName}" for ${patient.name}`,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
