import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUserSession } from '@/lib/auth';
import { ApiError, handleApiError, parseJsonBody } from '@/lib/api';
import { assertRateLimit } from '@/lib/rate-limit';
import { hashPassword } from '@/lib/password';
import { PLAN_DEFAULTS, TRIAL_MS } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const registerSchema = z.object({
  clinicName: z.string().trim().min(2).max(100),
  planTier: z.enum(['SOLO', 'CLINIC', 'GROWTH', 'ENTERPRISE']),
  doctorName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(8).max(20).optional(),
  specialty: z.string().trim().max(80).optional(),
  consultationFee: z.number().int().min(0).max(50000).optional(),
  password: z.string().min(6).max(100),
  hp_website: z.string().optional(),
});

function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'clinic'}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    assertRateLimit(request, {
      action: 'register_ip',
      limit: 5,
      windowMs: 60 * 60 * 1000,
      message: 'Too many clinic registrations from this network. Please try again later.',
    });

    const body = await parseJsonBody(request, registerSchema);

    if (body.hp_website && body.hp_website.trim().length > 0) {
      throw new ApiError(400, 'Invalid submission.', 'BOT_DETECTED');
    }

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists.', 'EMAIL_EXISTS');
    }

    const plan = PLAN_DEFAULTS[body.planTier];
    const fee = body.consultationFee ?? 200;

    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: body.clinicName,
          slug: toSlug(body.clinicName),
          phone: body.phone ?? null,
          planTier: body.planTier,
          subscriptionStatus: 'TRIAL',
          maxDoctors: plan.maxDoctors,
          maxStaff: plan.maxStaff,
          maxPatients: plan.maxPatients,
          maxStorageMb: plan.maxStorageMb,
          maxBranches: plan.maxBranches,
          enableBilling: plan.features.billing,
          enableAppointments: plan.features.appointments,
          enableOrders: plan.features.labAndPharmacy,
          defaultConsultFee: fee,
          trialEndsAt: new Date(Date.now() + TRIAL_MS),
        },
      });

      const mainBranch = await tx.branch.create({
        data: {
          clinicId: clinic.id,
          name: 'Main Clinic',
          code: 'MAIN',
          phone: body.phone ?? null,
          isDefault: true,
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          activeBranchId: mainBranch.id,
          name: body.doctorName,
          email: body.email,
          phone: body.phone ?? null,
          passwordHash: hashPassword(body.password),
          role: 'OWNER_DOCTOR',
          specialty: body.specialty ?? 'General Medicine',
          consultationFee: fee,
        },
      });

      await tx.clinicMedicinePreset.createMany({
        data: [
          {
            clinicId: clinic.id,
            doctorId: user.id,
            medicineName: 'Tab. Paracetamol 650mg',
            defaultDosage: '1-0-1',
            defaultTiming: 'After food',
            defaultDuration: 3,
          },
          {
            clinicId: clinic.id,
            doctorId: user.id,
            medicineName: 'Tab. Pantoprazole 40mg',
            defaultDosage: '1-0-0',
            defaultTiming: 'Before breakfast',
            defaultDuration: 5,
          },
          {
            clinicId: clinic.id,
            doctorId: user.id,
            medicineName: 'Tab. Cetirizine 10mg',
            defaultDosage: '0-0-1',
            defaultTiming: 'At bedtime',
            defaultDuration: 5,
          },
        ],
      });

      await tx.conditionTemplate.createMany({
        data: [
          {
            clinicId: clinic.id,
            doctorId: user.id,
            name: 'Viral Fever Pack',
            diagnosis: 'Acute Viral Fever',
            clinicalNotes: 'Oral hydration, tepid sponging if fever > 101°F. Return if persistent > 3 days.',
            followUpDays: 3,
            medicines: [
              { medicineName: 'Tab. Paracetamol 650mg', dosage: '1-0-1', timing: 'After food', durationDays: 3 },
              { medicineName: 'Tab. Cetirizine 10mg', dosage: '0-0-1', timing: 'At bedtime', durationDays: 5 },
            ],
          },
          {
            clinicId: clinic.id,
            doctorId: user.id,
            name: 'Acid Gastritis Pack',
            diagnosis: 'Acute Gastritis / GERD',
            clinicalNotes: 'Avoid spicy/oily food and late dinners.',
            followUpDays: 7,
            medicines: [
              { medicineName: 'Tab. Pantoprazole 40mg', dosage: '1-0-0', timing: 'Before breakfast', durationDays: 14 },
            ],
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          clinicId: clinic.id,
          actorUserId: user.id,
          actorName: user.name,
          action: 'CLINIC_REGISTERED',
          entityType: 'Clinic',
          entityId: clinic.id,
          summary: `Registered ${clinic.name} on ${plan.label} (${body.planTier}) trial.`,
        },
      });

      return { clinic, user };
    });

    await createUserSession(result.user.id, result.clinic.id);

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          clinicId: result.clinic.id,
          clinicName: result.clinic.name,
          planTier: result.clinic.planTier,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
