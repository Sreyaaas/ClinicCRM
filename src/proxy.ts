import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && MUTATING_METHODS.has(request.method)) {
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite === 'cross-site') {
      return NextResponse.json(
        { error: 'Cross-site API mutations are forbidden.', code: 'CROSS_SITE_FORBIDDEN' },
        {
          status: 403,
          headers: {
            Vary: 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site',
          },
        }
      );
    }
  }

  // Optimistic auth check for protected app routes; authoritative verification runs in requireSessionUser()
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    const hasSessionCookie =
      request.cookies.has('__Host-clinic_session') || request.cookies.has('clinic_session');
    if (!hasSessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set('Vary', 'Sec-Fetch-Dest, Sec-Fetch-Mode, Sec-Fetch-Site');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  );
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
