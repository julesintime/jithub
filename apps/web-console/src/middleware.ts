import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireOrganization } from '@/middleware/require-organization';

/**
 * Next.js Middleware
 *
 * Protects routes that require an active organization.
 * Runs before every request to check authentication and organization context.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  const publicRoutes = [
    '/',
    '/api/auth',
    '/onboarding',
    '/organizations/select',
    '/organizations/new',
  ];

  // Check if the route is public (exact match or starts with public path)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Require active organization for protected routes
  const orgResponse = await requireOrganization(request);
  if (orgResponse) {
    return orgResponse;
  }

  return NextResponse.next();
}

/**
 * Matcher configuration for middleware
 *
 * Runs middleware on all routes except static assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
