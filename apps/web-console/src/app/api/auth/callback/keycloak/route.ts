import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { KeycloakOrganizationClient } from '@/lib/keycloak/client';

/**
 * Keycloak OIDC Callback Handler
 *
 * This route handles the callback from Keycloak after successful authentication.
 * It performs the following steps:
 * 1. Complete the OAuth flow with better-auth
 * 2. Get user information from the session
 * 3. Create or get Keycloak organization based on email domain
 * 4. Add user to the organization
 * 5. Redirect to onboarding or dashboard
 *
 * References:
 * - Better Auth: https://www.better-auth.com/docs/plugins/generic-oauth
 * - Keycloak Organizations: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/organization/admin/resource/OrganizationsResource.html
 */
export async function GET(request: NextRequest) {
  try {
    // Get session after OAuth callback
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      console.error('No user session found after callback');
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
    }

    const user = session.user;
    const userEmail = user.email;

    if (!userEmail) {
      console.error('No email found in user session');
      return NextResponse.redirect(
        new URL('/?error=no_email', request.url)
      );
    }

    // Initialize Keycloak organization client
    const kcClient = new KeycloakOrganizationClient();

    try {
      // Extract organization from email domain
      const domain = userEmail.split('@')[1];
      const orgName = domain.split('.')[0]; // e.g., "example" from "user@example.com"

      // Check if organization exists for this domain
      let organizations = await kcClient.getOrganizationsForUser(userEmail);

      let orgId: string;

      if (organizations.length === 0) {
        // Create new organization
        console.log(`Creating organization for domain: ${domain}`);

        const newOrg = await kcClient.createOrganization({
          name: orgName.charAt(0).toUpperCase() + orgName.slice(1),
          alias: orgName.toLowerCase(),
          domains: [{ name: domain, verified: false }],
          attributes: {
            createdBy: [user.id],
            createdAt: [new Date().toISOString()],
          },
        });

        orgId = newOrg.id;
        console.log(`Created organization with ID: ${orgId}`);
      } else {
        // Use existing organization
        orgId = organizations[0].id!;
        console.log(`Using existing organization: ${orgId}`);
      }

      // Add user to organization
      console.log(`Adding user ${user.id} to organization ${orgId}`);
      await kcClient.addUserToOrganization(orgId, user.id);

      // Check if user needs onboarding
      // TODO: Check database for onboarding completion status
      const needsOnboarding = true; // For now, always show onboarding

      if (needsOnboarding) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      } else {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (orgError) {
      console.error('Organization setup error:', orgError);
      // Continue to app even if organization setup fails
      // User can set it up later
      return NextResponse.redirect(
        new URL('/?warning=org_setup_failed', request.url)
      );
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_failed', request.url));
  }
}
