import { NextResponse } from 'next/server';
import { clearUserSession } from '@/lib/auth';
import { handleApiError } from '@/lib/api';

function attachLogoutHeaders(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.cookies.set('__Host-clinic_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
  });
  res.cookies.set('clinic_session', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
  });
  return res;
}

export async function POST() {
  try {
    await clearUserSession();
    return attachLogoutHeaders(NextResponse.json({ ok: true }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    await clearUserSession();
    return attachLogoutHeaders(NextResponse.redirect(new URL('/login', request.url)));
  } catch (error) {
    return handleApiError(error);
  }
}
