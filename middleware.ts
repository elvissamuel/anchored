import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key'
);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes that don't need authentication
  const publicRoutes = ['/auth/login', '/auth/register', '/'];

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session token from cookies
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    const verified = await jwtVerify(token, secret);
    const session = verified.payload as any;

    // Check role-based access
    if (pathname.startsWith('/admin') && session.orgRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/user', request.url));
    }

    if (pathname.startsWith('/user') && session.orgRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Clone request headers and add user info
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', session.userId);
    requestHeaders.set('x-user-role', session.orgRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/user/:path*', '/api/:path*'],
};
