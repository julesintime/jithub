import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organization, member, keycloakSyncState } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { KeycloakOrganizationClient } from '@/lib/keycloak/client';
import { validateSlug } from '@/lib/utils/slug';

/**
 * POST /api/organization/create
 *
 * Create a new organization in Keycloak and sync to PostgreSQL
 *
 * Request Body:
 * - name: Organization name (user-chosen)
 * - slug: URL-safe slug (auto-generated, validated)
 *
 * Flow:
 * 1. Validate user session
 * 2. Validate slug format and uniqueness
 * 3. Create organization in Keycloak with attributes
 * 4. Add user as organization owner in Keycloak
 * 5. Sync organization and membership to PostgreSQL
 * 6. Return success with organization details
 *
 * @example
 * POST /api/organization/create
 * { "name": "Acme Inc", "slug": "acme-inc" }
 * → { success: true, organization: { id, name, slug, keycloakOrgId } }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate user session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in first' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Organization name and slug are required' },
        { status: 400 }
      );
    }

    // 3. Validate slug format
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 4. Check slug uniqueness in PostgreSQL
    const existingOrgInDb = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (existingOrgInDb.length > 0) {
      return NextResponse.json(
        { error: `Organization slug '${slug}' is already taken` },
        { status: 409 }
      );
    }

    // 5. Check slug uniqueness in Keycloak
    const keycloakClient = new KeycloakOrganizationClient();
    const existingOrgInKeycloak = await keycloakClient.searchOrganizationsByAlias(slug);

    if (existingOrgInKeycloak.length > 0) {
      return NextResponse.json(
        { error: `Organization slug '${slug}' is already registered in Keycloak` },
        { status: 409 }
      );
    }

    // 6. Create organization in Keycloak
    const keycloakOrg = await keycloakClient.createOrganization({
      name,
      alias: slug,
      attributes: {
        slug: [slug],
        created_by: [session.user.id],
        created_at: [new Date().toISOString()],
        custom_domain: [],
        domain_verified: ['false'],
        subscription_plan: ['free'],
      },
    });

    console.log('[Organization Create] Created in Keycloak:', keycloakOrg.id);

    // 7. Get Keycloak user ID by email
    const keycloakUser = await keycloakClient.getUserByEmail(session.user.email);

    if (!keycloakUser) {
      // This should not happen if user is authenticated via Keycloak
      console.error('[Organization Create] Keycloak user not found:', session.user.email);
      return NextResponse.json(
        { error: 'User not found in Keycloak - Please contact support' },
        { status: 500 }
      );
    }

    // 8. Add user as organization owner in Keycloak
    await keycloakClient.addUserToOrganization(keycloakOrg.id, keycloakUser.id);
    console.log('[Organization Create] Added user as member in Keycloak');

    // 9. Sync organization to PostgreSQL
    const orgId = generateId();
    const newOrg = await db
      .insert(organization)
      .values({
        id: orgId,
        name,
        slug,
        keycloakOrgId: keycloakOrg.id,
        createdBy: session.user.id,
        subscriptionPlan: 'free',
        customDomain: null,
        domainVerified: false,
      })
      .returning();

    console.log('[Organization Create] Synced to PostgreSQL:', newOrg[0].id);

    // 10. Create sync state record
    await db.insert(keycloakSyncState).values({
      id: generateId(),
      entityType: 'organization',
      entityId: orgId,
      keycloakId: keycloakOrg.id,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    });

    // 11. Sync membership to PostgreSQL
    const memberId = generateId();
    await db.insert(member).values({
      id: memberId,
      organizationId: orgId,
      userId: session.user.id,
      role: 'owner',
    });

    console.log('[Organization Create] Added user as owner in PostgreSQL');

    // 12. Create sync state for membership
    await db.insert(keycloakSyncState).values({
      id: generateId(),
      entityType: 'member',
      entityId: memberId,
      keycloakId: keycloakUser.id,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    });

    // 13. Return success
    return NextResponse.json({
      success: true,
      organization: {
        id: newOrg[0].id,
        name: newOrg[0].name,
        slug: newOrg[0].slug,
        keycloakOrgId: newOrg[0].keycloakOrgId,
        role: 'owner',
      },
    });
  } catch (error) {
    console.error('[Organization Create] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to create organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
