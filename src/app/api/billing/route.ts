import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser, requirePlanFeature } from '@/lib/api';
import { recordAuditLog } from '@/lib/audit';
import { getIstDayBounds, getIstDayString } from '@/lib/date';
import { generateNextInvoiceNumber } from '@/lib/invoice-number';
import { getPlanFeatures } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const lineItemSchema = z.object({
  label: z.string().trim().min(1).max(120),
  category: z.enum(['CONSULTATION', 'PROCEDURE', 'LAB', 'PHARMACY', 'OTHER']).default('CONSULTATION'),
  qty: z.number().int().min(1).max(100).default(1),
  unitPrice: z.number().int().min(0).max(100000),
});

const createBillingSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  visitId: z.string().uuid().nullable().optional(),
  queueEntryId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  amount: z.number().int().min(0).max(100000).optional(),
  discount: z.number().int().min(0).max(100000).default(0),
  gstRatePercent: z.number().int().min(0).max(28).default(0),
  lineItems: z.array(lineItemSchema).max(25).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTIAL']).default('PAID'),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'OTHER']).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    requirePlanFeature(user, 'billing');

    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day') ?? getIstDayString();
    const { start, end } = getIstDayBounds(day);

    const [records, expenses] = await Promise.all([
      prisma.billingRecord.findMany({
        where: {
          clinicId: user.clinicId,
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, patientCode: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true, specialty: true } },
          collectedBy: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
      getPlanFeatures(user.clinic.planTier).expensesTracker
        ? prisma.expense.findMany({
            where: {
              clinicId: user.clinicId,
              spentOn: { gte: start, lte: end },
            },
            orderBy: { createdAt: 'desc' },
            include: { recordedBy: { select: { id: true, name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const summary = {
      day,
      totalBilled: 0,
      totalCollected: 0,
      totalUnpaid: 0,
      totalGst: 0,
      totalExpenses,
      netCash: 0,
      byMode: { CASH: 0, UPI: 0, CARD: 0, OTHER: 0 },
      byDoctor: [] as Array<{
        doctorId: string;
        doctorName: string;
        billCount: number;
        collected: number;
        unpaid: number;
      }>,
    };

    const docMap = new Map<
      string,
      { doctorId: string; doctorName: string; billCount: number; collected: number; unpaid: number }
    >();

    for (const r of records) {
      summary.totalBilled += r.netAmount;
      summary.totalGst += r.gstAmount;
      const docEntry = docMap.get(r.doctorId) ?? {
        doctorId: r.doctorId,
        doctorName: r.doctor.name,
        billCount: 0,
        collected: 0,
        unpaid: 0,
      };
      docEntry.billCount += 1;

      if (r.paymentStatus === 'PAID') {
        summary.totalCollected += r.netAmount;
        docEntry.collected += r.netAmount;
        const mode = r.paymentMode ?? 'OTHER';
        summary.byMode[mode] += r.netAmount;
      } else {
        summary.totalUnpaid += r.netAmount;
        docEntry.unpaid += r.netAmount;
      }

      docMap.set(r.doctorId, docEntry);
    }

    summary.byDoctor = Array.from(docMap.values());
    summary.netCash = summary.totalCollected - totalExpenses;

    return NextResponse.json({ records, summary, expenses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    requirePlanFeature(user, 'billing');
    const features = getPlanFeatures(user.clinic.planTier);
    const body = await parseJsonBody(request, createBillingSchema);

    if (
      ((body.lineItems && body.lineItems.length > 1) || body.gstRatePercent > 0) &&
      !features.itemizedGstBilling
    ) {
      throw new ApiError(
        403,
        'Itemized multi-line billing & GST invoices require Clinic Growth or Enterprise.',
        'PLAN_UPGRADE_REQUIRED'
      );
    }

    const [patient, doctor] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: body.patientId, clinicId: user.clinicId },
        select: { id: true, name: true },
      }),
      prisma.user.findFirst({
        where: { id: body.doctorId, clinicId: user.clinicId, role: { in: ['OWNER_DOCTOR', 'DOCTOR'] } },
        select: { id: true },
      }),
    ]);

    if (!patient) throw new ApiError(404, 'Patient not found.', 'PATIENT_NOT_FOUND');
    if (!doctor) throw new ApiError(404, 'Doctor not found.', 'DOCTOR_NOT_FOUND');

    const normalizedItems =
      body.lineItems && body.lineItems.length > 0
        ? body.lineItems.map((i) => ({ ...i, total: i.qty * i.unitPrice }))
        : [
            {
              label: 'OPD Consultation',
              category: 'CONSULTATION' as const,
              qty: 1,
              unitPrice: body.amount ?? 0,
              total: body.amount ?? 0,
            },
          ];

    const subTotal =
      body.lineItems && body.lineItems.length > 0
        ? normalizedItems.reduce((sum, i) => sum + i.total, 0)
        : (body.amount ?? 0);

    const taxable = Math.max(0, subTotal - body.discount);
    const gstAmount = Math.round((taxable * body.gstRatePercent) / 100);
    const netAmount = taxable + gstAmount;

    const record = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateNextInvoiceNumber(tx, user.clinicId);
      return tx.billingRecord.create({
        data: {
          clinicId: user.clinicId,
          branchId: body.branchId ?? user.activeBranchId ?? null,
          patientId: patient.id,
          doctorId: doctor.id,
          visitId: body.visitId ?? null,
          queueEntryId: body.queueEntryId ?? null,
          invoiceNumber,
          amount: subTotal,
          discount: body.discount,
          gstRatePercent: body.gstRatePercent,
          gstAmount,
          netAmount,
          lineItems: normalizedItems,
          paymentStatus: body.paymentStatus,
          paymentMode: body.paymentStatus === 'UNPAID' ? null : (body.paymentMode ?? 'CASH'),
          notes: body.notes || null,
          collectedByUserId: body.paymentStatus === 'UNPAID' ? null : user.id,
          collectedAt: body.paymentStatus === 'UNPAID' ? null : new Date(),
        },
        include: {
          patient: { select: { id: true, patientCode: true, name: true, phone: true } },
          doctor: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });
    });

    await recordAuditLog({
      clinicId: user.clinicId,
      actorUserId: user.id,
      actorName: user.name,
      action: 'BILL_CREATED',
      entityType: 'BillingRecord',
      entityId: record.id,
      summary: `Issued ${record.invoiceNumber} (₹${record.netAmount}) for ${patient.name}`,
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
