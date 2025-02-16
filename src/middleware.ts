import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const publicPaths = [
  '/auth/signin',
  '/auth/signup',
  '/auth/verify',
  '/auth/error',
  '/api/auth',
  '/api/trpc/auth',
  '/api/trpc/business',
  '/api/upload',
];

// API routes that require business verification
const protectedApiRoutes = [
  '/api/trpc/property.create',
  '/api/trpc/property.update',
  '/api/trpc/property.delete',
  '/api/trpc/room.create',
  '/api/trpc/room.update',
  '/api/trpc/room.delete',
  '/api/trpc/tenant.create',
  '/api/trpc/tenant.update',
  '/api/trpc/tenant.delete',
  '/api/trpc/billing.create',
  '/api/trpc/billing.update',
  '/api/trpc/expense.create',
  '/api/trpc/expense.update',
  '/api/trpc/expense.delete',
  '/api/trpc/maintenance.create',
  '/api/trpc/maintenance.update',
  '/api/trpc/maintenance.delete',
  '/properties/new',
  '/tenants/new',
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

  // For protected API routes, check verification
  const isProtectedApiRoute = protectedApiRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (!isVerified && isProtectedApiRoute) {
    return NextResponse.redirect(new URL('/business-verification', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
