import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organization, member } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { KeycloakOrganizationClient } from '@/lib/keycloak/client';
import {
  generateVerificationToken,
  verifyDomainOwnership,
  getVerificationInstructions,
} from '@/lib/dns/verification';

/**
 * POST /api/organization/[organizationId]/domain
 *
 * Add a custom domain to an organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    // 1. Validate user session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = params;

    // 2. Parse request body
    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // 3. Get organization
    const org = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const orgData = org[0];

    // 4. Check if user has permission (must be owner)
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, session.user.id)
        )
      )
      .limit(1);

    if (membership.length === 0 || membership[0].role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can manage domains' },
        { status: 403 }
      );
    }

    // 5. Check if organization already has a domain
    if (orgData.customDomain) {
      return NextResponse.json(
        { error: 'Organization already has a custom domain. Remove it first.' },
        { status: 409 }
      );
    }

    // 6. Generate verification token
    const verificationToken = generateVerificationToken();

    // 7. Update organization with domain and verification token
    await db
      .update(organization)
      .set({
        customDomain: domain,
        domainVerified: false,
        // Store verification token in metadata for now
        metadata: JSON.stringify({
          domainVerificationToken: verificationToken,
          domainAddedAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      })
      .where(eq(organization.id, organizationId));

    // 8. Get verification instructions
    const instructions = getVerificationInstructions(domain, verificationToken);

    console.log(`[Domain] Added custom domain: ${domain} for org: ${organizationId}`);

    return NextResponse.json({
      success: true,
      domain,
      verified: false,
      verification: instructions,
    });
  } catch (error) {
    console.error('[Domain] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to add custom domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organization/[organizationId]/domain
 *
 * Remove custom domain from organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    // 1. Validate user session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = params;

    // 2. Check if user has permission (must be owner)
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, session.user.id)
        )
      )
      .limit(1);

    if (membership.length === 0 || membership[0].role !== 'owner') {
      return NextResponse.json(
        { error: 'Only organization owners can manage domains' },
        { status: 403 }
      );
    }

    // 3. Get organization
    const org = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const orgData = org[0];

    // 4. Update Keycloak to remove domain
    if (orgData.keycloakOrgId && orgData.customDomain) {
      try {
        const kcClient = new KeycloakOrganizationClient();
        const kcOrg = await kcClient.getOrganization(orgData.keycloakOrgId);

        if (kcOrg) {
          // Remove domain from Keycloak
          await kcClient.updateOrganization(orgData.keycloakOrgId, {
            ...kcOrg,
            domains: [],
            attributes: {
              ...kcOrg.attributes,
              custom_domain: [],
              domain_verified: ['false'],
            },
          });
        }
      } catch (kcError) {
        console.error('[Domain] Error updating Keycloak:', kcError);
        // Continue even if Keycloak update fails
      }
    }

    // 5. Remove domain from PostgreSQL
    await db
      .update(organization)
      .set({
        customDomain: null,
        domainVerified: false,
        metadata: null,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, organizationId));

    console.log(`[Domain] Removed custom domain for org: ${organizationId}`);

    return NextResponse.json({
      success: true,
      message: 'Custom domain removed successfully',
    });
  } catch (error) {
    console.error('[Domain] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove custom domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
