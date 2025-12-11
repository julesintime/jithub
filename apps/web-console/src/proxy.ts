import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/config';

/**
 * Next.js Proxy (Next.js 16+)
 *
 * Protects routes that require an active organization.
 * Runs on Node.js runtime (automatic in Next.js 16) to support better-auth session checks.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 * @see https://www.better-auth.com/docs/integrations/next
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  const publicRoutes = [
    '/',
    '/api/auth',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/onboarding',
    '/organizations/select',
    '/organizations/new',
  ];

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

  // Check session using better-auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    // Not authenticated - redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Check if user has an active organization
  if (!session.session.activeOrganizationId) {
    // For API routes, return 403
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No active organization. Please select an organization first.' },
        { status: 403 }
      );
    }

    // For pages, redirect to organization selection
    return NextResponse.redirect(new URL('/organizations/select', request.url));
  }

  return NextResponse.next();
}

/**
 * Route matcher configuration
 * Note: In Next.js 16, proxy always runs on Node.js runtime (cannot be configured)
 * @see https://nextjs.org/docs/app/guides/upgrading/version-16
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
