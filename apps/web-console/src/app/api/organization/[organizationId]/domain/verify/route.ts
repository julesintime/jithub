import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organization, member } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { KeycloakOrganizationClient } from '@/lib/keycloak/client';
import { verifyDomainOwnership } from '@/lib/dns/verification';

/**
 * POST /api/organization/[organizationId]/domain/verify
 *
 * Verify domain ownership via DNS TXT record
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

    // 2. Get organization
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

    // 3. Check if user has permission (must be owner)
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
        { error: 'Only organization owners can verify domains' },
        { status: 403 }
      );
    }

    // 4. Check if organization has a domain to verify
    if (!orgData.customDomain) {
      return NextResponse.json(
        { error: 'No custom domain configured' },
        { status: 400 }
      );
    }

    // 5. Check if already verified
    if (orgData.domainVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Domain already verified',
        domain: orgData.customDomain,
      });
    }

    // 6. Get verification token from metadata
    let verificationToken: string;
    try {
      const metadata = orgData.metadata ? JSON.parse(orgData.metadata) : {};
      verificationToken = metadata.domainVerificationToken;

      if (!verificationToken) {
        return NextResponse.json(
          { error: 'Verification token not found. Please add domain again.' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid metadata. Please add domain again.' },
        { status: 400 }
      );
    }

    // 7. Verify domain ownership via DNS
    console.log(`[Domain Verify] Verifying domain: ${orgData.customDomain}`);

    const verificationResult = await verifyDomainOwnership(
      orgData.customDomain,
      verificationToken
    );

    if (!verificationResult.verified) {
      return NextResponse.json(
        {
          verified: false,
          error: verificationResult.error || 'Domain verification failed',
        },
        { status: 400 }
      );
    }

    // 8. Update PostgreSQL
    await db
      .update(organization)
      .set({
        domainVerified: true,
        metadata: JSON.stringify({
          ...JSON.parse(orgData.metadata || '{}'),
          domainVerifiedAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      })
      .where(eq(organization.id, organizationId));

    // 9. Update Keycloak organization with verified domain
    if (orgData.keycloakOrgId) {
      try {
        const kcClient = new KeycloakOrganizationClient();
        const kcOrg = await kcClient.getOrganization(orgData.keycloakOrgId);

        if (kcOrg) {
          await kcClient.updateOrganization(orgData.keycloakOrgId, {
            ...kcOrg,
            domains: [{ name: orgData.customDomain, verified: true }],
            attributes: {
              ...kcOrg.attributes,
              custom_domain: [orgData.customDomain],
              domain_verified: ['true'],
              domain_verified_at: [new Date().toISOString()],
            },
          });

          console.log(`[Domain Verify] Updated Keycloak with verified domain: ${orgData.customDomain}`);
        }
      } catch (kcError) {
        console.error('[Domain Verify] Error updating Keycloak:', kcError);
        // Domain is verified in PostgreSQL, Keycloak sync can be retried later
      }
    }

    console.log(`[Domain Verify] Domain verified successfully: ${orgData.customDomain}`);

    return NextResponse.json({
      success: true,
      verified: true,
      domain: orgData.customDomain,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Domain Verify] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
