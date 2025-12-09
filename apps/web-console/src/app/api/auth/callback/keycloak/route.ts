import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { member } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Keycloak OIDC Callback Handler
 *
 * This route handles the callback from Keycloak after successful authentication.
 * It performs the following steps:
 * 1. Complete the OAuth flow with better-auth
 * 2. Get user information from the session
 * 3. Check if user is a member of any organizations
 * 4. If no organizations → redirect to onboarding (user will create org)
 * 5. If has organizations → redirect to dashboard
 *
 * Note: Organization creation is now handled by the onboarding UI,
 * which calls /api/organization/create with user-chosen org name.
 * This keeps auth callback simple and follows modern SaaS patterns.
 *
 * References:
 * - Better Auth: https://www.better-auth.com/docs/plugins/generic-oauth
 * - Keycloak Organizations: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/organization/admin/resource/OrganizationsResource.html
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[OIDC Callback] Processing Keycloak callback...');

    // Get session after OAuth callback
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      console.error('[OIDC Callback] No user session found after callback');
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }

    const user = session.user;
    console.log(`[OIDC Callback] User authenticated: ${user.email}`);

    // Check if user is a member of any organizations
    const memberships = await db
      .select()
      .from(member)
      .where(eq(member.userId, user.id))
      .limit(1);

    if (memberships.length === 0) {
      // User has no organizations - redirect to onboarding
      console.log('[OIDC Callback] No organizations found - redirecting to onboarding');
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // User has at least one organization - redirect to dashboard
    console.log(`[OIDC Callback] User has ${memberships.length} organization(s) - redirecting to dashboard`);
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('[OIDC Callback] Error:', error);
    return NextResponse.redirect(new URL('/?error=callback_failed', request.url));
  }
}
