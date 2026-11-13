import { NextResponse } from 'next/server';
import { clearUserSession } from '@/lib/auth';
import { handleApiError } from '@/lib/api';

export async function POST() {
  try {
    await clearUserSession();
    return NextResponse.json(
      { ok: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
