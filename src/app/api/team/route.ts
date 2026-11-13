import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { hashPassword } from '@/lib/password';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(8).max(20).optional(),
  role: z.enum(['DOCTOR', 'STAFF']),
  specialty: z.string().trim().max(80).optional(),
  consultationFee: z.number().int().min(0).max(50000).optional(),
  password: z.string().min(6).max(100),
});

export async function GET() {
  try {
    const user = await requireApiUser();
    const members = await prisma.user.findMany({
      where: { clinicId: user.clinicId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        specialty: true,
        consultationFee: true,
        isActive: true,
        createdAt: true,
      },
    });

    const activeDoctors = members.filter((m) => m.isActive && isDoctorRole(m.role)).length;
    const activeStaff = members.filter((m) => m.isActive && m.role === 'STAFF').length;

    return NextResponse.json({
      members,
      limits: {
        planTier: user.clinic.planTier,
        activeDoctors,
        maxDoctors: user.clinic.maxDoctors,
        activeStaff,
        maxStaff: user.clinic.maxStaff,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR'],
      requireActiveSub: true,
    });
    const body = await parseJsonBody(request, createMemberSchema);

    const [activeDoctors, activeStaff, existingEmail] = await Promise.all([
      prisma.user.count({
        where: {
          clinicId: user.clinicId,
          isActive: true,
          role: { in: ['OWNER_DOCTOR', 'DOCTOR'] },
        },
      }),
      prisma.user.count({
        where: { clinicId: user.clinicId, isActive: true, role: 'STAFF' },
      }),
      prisma.user.findUnique({ where: { email: body.email }, select: { id: true } }),
    ]);

    if (existingEmail) {
      throw new ApiError(409, 'Email is already registered.', 'EMAIL_EXISTS');
    }

    if (body.role === 'DOCTOR' && activeDoctors >= user.clinic.maxDoctors) {
      throw new ApiError(
        403,
        `Your ${user.clinic.planTier} plan allows up to ${user.clinic.maxDoctors} active doctor(s). Upgrade plan to add more.`,
        'PLAN_LIMIT_REACHED'
      );
    }

    if (body.role === 'STAFF' && activeStaff >= user.clinic.maxStaff) {
      throw new ApiError(
        403,
        user.clinic.maxStaff === 0
          ? 'Your Solo Doctor plan does not include front-desk staff seats. Upgrade to the Clinic Plan to add staff.'
          : `Your ${user.clinic.planTier} plan allows up to ${user.clinic.maxStaff} active staff accounts.`,
        'PLAN_LIMIT_REACHED'
      );
    }

    const member = await prisma.user.create({
      data: {
        clinicId: user.clinicId,
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        passwordHash: hashPassword(body.password),
        role: body.role,
        specialty: body.role === 'DOCTOR' ? (body.specialty ?? 'General Medicine') : null,
        consultationFee:
          body.role === 'DOCTOR'
            ? (body.consultationFee ?? user.clinic.defaultConsultFee)
            : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        specialty: true,
        consultationFee: true,
        isActive: true,
      },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
