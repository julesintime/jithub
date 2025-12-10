import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

/**
 * Middleware to require an active organization
 *
 * Redirects to organization selection page if user doesn't have an active organization.
 * Uses better-auth's session.activeOrganizationId field.
 *
 * @param request - Next.js request object
 * @param redirectPath - Optional path to redirect to if no active org (default: /organizations/select)
 * @returns NextResponse
 *
 * @example
 * ```ts
 * // In your page or API route
 * const response = await requireOrganization(request);
 * if (response) return response;
 * ```
 *
 * @see https://www.better-auth.com/docs/plugins/organization#active-organization
 */
export async function requireOrganization(
  request: NextRequest,
  redirectPath = '/organizations/select'
): Promise<NextResponse | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user has an active organization
  if (!session.session.activeOrganizationId) {
    // For API routes, return 403
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No active organization. Please select an organization first.' },
        { status: 403 }
      );
    }

    // For pages, redirect to organization selection
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return null; // No redirect needed
}

/**
 * Get the active organization ID from the session
 *
 * @param request - Next.js request object
 * @returns The active organization ID or null
 */
export async function getActiveOrganizationId(
  request: NextRequest
): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return session?.session?.activeOrganizationId || null;
}
