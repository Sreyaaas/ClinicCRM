import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, parseJsonBody, requireApiUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

const createPresetSchema = z.object({
  medicineName: z.string().trim().min(1).max(160),
  defaultDosage: z.string().trim().max(40).nullable().optional(),
  defaultTiming: z.string().trim().max(60).nullable().optional(),
  defaultDuration: z.number().int().min(1).max(365).nullable().optional(),
  instructions: z.string().trim().max(200).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();

    const presets = await prisma.clinicMedicinePreset.findMany({
      where: {
        clinicId: user.clinicId,
        ...(q ? { medicineName: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ usageCount: 'desc' }, { medicineName: 'asc' }],
      take: 50,
    });

    return NextResponse.json(
      { presets },
      {
        headers: {
          'Cache-Control': q
            ? 'private, no-cache'
            : 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser({
      roles: ['OWNER_DOCTOR', 'DOCTOR'],
      requireActiveSub: true,
    });
    const body = await parseJsonBody(request, createPresetSchema);

    const preset = await prisma.clinicMedicinePreset.create({
      data: {
        clinicId: user.clinicId,
        doctorId: user.id,
        medicineName: body.medicineName,
        defaultDosage: body.defaultDosage || null,
        defaultTiming: body.defaultTiming || null,
        defaultDuration: body.defaultDuration ?? null,
        instructions: body.instructions || null,
      },
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
