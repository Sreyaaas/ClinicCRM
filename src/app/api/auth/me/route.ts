import { NextResponse } from 'next/server';
import { handleApiError, requireApiUser } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireApiUser();
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
