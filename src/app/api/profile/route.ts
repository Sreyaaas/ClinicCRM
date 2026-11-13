import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { isDoctorRole } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  specialty: z.string().trim().max(80).nullable().optional(),
  registrationNo: z.string().trim().max(80).nullable().optional(),
  consultationFee: z.number().int().min(0).max(50000).nullable().optional(),
  defaultCaptureMode: z.enum(['HYBRID', 'SLIP_FIRST', 'RX_FIRST']).optional(),
  preferredWhatsappLang: z.enum(['en', 'ml']).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser({ requireActiveSub: true });
    const body = await parseJsonBody(request, updateProfileSchema);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(body.preferredWhatsappLang !== undefined
          ? { preferredWhatsappLang: body.preferredWhatsappLang }
          : {}),
        ...(isDoctorRole(user.role)
          ? {
              ...(body.specialty !== undefined ? { specialty: body.specialty || null } : {}),
              ...(body.registrationNo !== undefined
                ? { registrationNo: body.registrationNo || null }
                : {}),
              ...(body.consultationFee !== undefined
                ? { consultationFee: body.consultationFee }
                : {}),
              ...(body.defaultCaptureMode !== undefined
                ? { defaultCaptureMode: body.defaultCaptureMode }
                : {}),
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        specialty: true,
        registrationNo: true,
        consultationFee: true,
        defaultCaptureMode: true,
        preferredWhatsappLang: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
