import { NextResponse } from 'next/server';
import { clearUserSession } from '@/lib/auth';

export async function GET(request: Request) {
  await clearUserSession();
  const res = NextResponse.redirect(new URL('/login', request.url));
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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
