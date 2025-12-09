/**
 * Keycloak Sync Service
 *
 * Handles syncing data from Keycloak (source of truth) to PostgreSQL (cache)
 * Used during OIDC callback to detect and sync new organization memberships
 */

import { db } from '@/lib/db';
import { organization, member, invitation, keycloakSyncState } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { KeycloakOrganizationClient } from './client';

interface SyncResult {
  newOrganizations: number;
  newMemberships: number;
  acceptedInvitations: number;
}

/**
 * Sync user's organization memberships from Keycloak to PostgreSQL
 *
 * This is called during OIDC callback to detect:
 * - New organizations the user has joined (via invitation)
 * - Organizations that need to be created in PostgreSQL
 * - Invitations that should be marked as accepted
 */
export async function syncUserOrganizations(
  userId: string,
  userEmail: string
): Promise<SyncResult> {
  const result: SyncResult = {
    newOrganizations: 0,
    newMemberships: 0,
    acceptedInvitations: 0,
  };

  const kcClient = new KeycloakOrganizationClient();

  try {
    // Get Keycloak user ID
    const kcUser = await kcClient.getUserByEmail(userEmail);
    if (!kcUser) {
      console.warn(`[Sync] Keycloak user not found: ${userEmail}`);
      return result;
    }

    // Get all organizations from Keycloak
    // Note: Keycloak doesn't have a direct API to get organizations for a user
    // We use the deprecated getOrganizationsForUser which filters by email domain
    // In production, we should query Keycloak for user's organization memberships
    const kcOrganizations = await kcClient.getOrganizationsForUser(userEmail);

    console.log(`[Sync] Found ${kcOrganizations.length} organizations in Keycloak for ${userEmail}`);

    for (const kcOrg of kcOrganizations) {
      if (!kcOrg.id) continue;

      // Check if organization exists in PostgreSQL
      const existingOrg = await db
        .select()
        .from(organization)
        .where(eq(organization.keycloakOrgId, kcOrg.id))
        .limit(1);

      let orgId: string;

      if (existingOrg.length === 0) {
        // Organization doesn't exist in PostgreSQL - create it
        console.log(`[Sync] Creating organization in PostgreSQL: ${kcOrg.name}`);

        orgId = generateId();
        await db.insert(organization).values({
          id: orgId,
          name: kcOrg.name || 'Unknown',
          slug: kcOrg.alias || generateId(),
          keycloakOrgId: kcOrg.id,
        });

        // Create sync state record
        await db.insert(keycloakSyncState).values({
          id: generateId(),
          entityType: 'organization',
          entityId: orgId,
          keycloakId: kcOrg.id,
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
        });

        result.newOrganizations++;
      } else {
        orgId = existingOrg[0].id;
      }

      // Check if membership exists in PostgreSQL
      const existingMembership = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.organizationId, orgId),
            eq(member.userId, userId)
          )
        )
        .limit(1);

      if (existingMembership.length === 0) {
        // Membership doesn't exist - create it
        console.log(`[Sync] Creating membership in PostgreSQL: ${userId} -> ${orgId}`);

        const memberId = generateId();
        await db.insert(member).values({
          id: memberId,
          organizationId: orgId,
          userId,
          role: 'member', // Default role, can be updated later
        });

        // Create sync state record
        await db.insert(keycloakSyncState).values({
          id: generateId(),
          entityType: 'member',
          entityId: memberId,
          keycloakId: kcUser.id,
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
        });

        result.newMemberships++;

        // Check if there's a pending invitation for this user/org
        const pendingInvitation = await db
          .select()
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, orgId),
              eq(invitation.email, userEmail),
              eq(invitation.status, 'pending')
            )
          )
          .limit(1);

        if (pendingInvitation.length > 0) {
          // Mark invitation as accepted
          await db
            .update(invitation)
            .set({
              status: 'accepted',
              acceptedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(invitation.id, pendingInvitation[0].id));

          console.log(`[Sync] Marked invitation as accepted: ${pendingInvitation[0].id}`);
          result.acceptedInvitations++;
        }
      }
    }

    console.log('[Sync] Sync completed:', result);
    return result;
  } catch (error) {
    console.error('[Sync] Error syncing organizations:', error);
    throw error;
  }
}

/**
 * Sync a specific organization from Keycloak to PostgreSQL
 */
export async function syncOrganization(keycloakOrgId: string): Promise<string> {
  const kcClient = new KeycloakOrganizationClient();

  const kcOrg = await kcClient.getOrganization(keycloakOrgId);
  if (!kcOrg) {
    throw new Error(`Organization not found in Keycloak: ${keycloakOrgId}`);
  }

  // Check if organization exists in PostgreSQL
  const existingOrg = await db
    .select()
    .from(organization)
    .where(eq(organization.keycloakOrgId, keycloakOrgId))
    .limit(1);

  if (existingOrg.length > 0) {
    return existingOrg[0].id;
  }

  // Create organization
  const orgId = generateId();
  await db.insert(organization).values({
    id: orgId,
    name: kcOrg.name || 'Unknown',
    slug: kcOrg.alias || generateId(),
    keycloakOrgId: keycloakOrgId,
  });

  // Create sync state
  await db.insert(keycloakSyncState).values({
    id: generateId(),
    entityType: 'organization',
    entityId: orgId,
    keycloakId: keycloakOrgId,
    syncStatus: 'synced',
    lastSyncedAt: new Date(),
  });

  return orgId;
}
