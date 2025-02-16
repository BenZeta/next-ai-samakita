import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = [
  '/auth/signin',
  '/auth/signup',
  '/auth/verify',
  '/auth/error',
  '/api/auth',
  '/api/trpc',
  '/api/upload',
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
  if (isPublicPath) return NextResponse.next();

  // Redirect to signin if not authenticated
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Allow access to business verification page
  if (request.nextUrl.pathname === '/business-verification') {
    return NextResponse.next();
  }

  // Check business verification status from token
  const isVerified = token.businessVerified === true;

  // If not verified and trying to access protected routes, redirect to business verification
  if (!isVerified && !request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/business-verification', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
