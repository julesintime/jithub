import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organization, member, invitation } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from 'better-auth';
import { KeycloakOrganizationClient } from '@/lib/keycloak/client';

/**
 * POST /api/organization/invite
 *
 * Invite a user to an organization using Keycloak native invitation API
 *
 * Request Body:
 * - organizationId: Organization ID to invite user to
 * - email: Email address of user to invite
 * - role: Role to assign (owner/admin/member)
 * - firstName: Optional first name
 * - lastName: Optional last name
 *
 * Flow:
 * 1. Validate user session and permissions
 * 2. Verify organization exists and user has invite permission
 * 3. Send invitation via Keycloak API
 * 4. Track invitation in PostgreSQL (optional, for UI display)
 * 5. Return success
 *
 * Keycloak handles:
 * - Sending invitation email with link
 * - User registration (if new user)
 * - Adding user to organization after acceptance
 *
 * @example
 * POST /api/organization/invite
 * {
 *   "organizationId": "org_123",
 *   "email": "bob@external.com",
 *   "role": "member",
 *   "firstName": "Bob",
 *   "lastName": "Smith"
 * }
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
    const { organizationId, email, role = 'member', firstName, lastName } = body;

    if (!organizationId || !email) {
      return NextResponse.json(
        { error: 'Organization ID and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: owner, admin, or member' },
        { status: 400 }
      );
    }

    // 3. Get organization from database
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

    // 4. Check if user has permission to invite (must be owner or admin)
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

    if (membership.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    const userRole = membership[0].role;
    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only organization owners and admins can invite users' },
        { status: 403 }
      );
    }

    // 5. Check if user is already a member
    const existingMember = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, session.user.id)
        )
      )
      .limit(1);

    if (existingMember.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 }
      );
    }

    // 6. Check if there's already a pending invitation
    const existingInvitation = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.email, email),
          eq(invitation.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        { error: 'Invitation already sent to this email' },
        { status: 409 }
      );
    }

    // 7. Send invitation via Keycloak API
    const keycloakClient = new KeycloakOrganizationClient();

    if (!orgData.keycloakOrgId) {
      return NextResponse.json(
        { error: 'Organization not linked to Keycloak' },
        { status: 500 }
      );
    }

    await keycloakClient.inviteUserToOrganization(
      orgData.keycloakOrgId,
      email,
      firstName,
      lastName
    );

    console.log('[Invite] Sent Keycloak invitation:', {
      email,
      organizationId: orgData.keycloakOrgId,
    });

    // 8. Track invitation in PostgreSQL (for UI display)
    const invitationId = generateId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await db.insert(invitation).values({
      id: invitationId,
      organizationId,
      email,
      role,
      status: 'pending',
      expiresAt,
      inviterId: session.user.id,
    });

    console.log('[Invite] Tracked invitation in database:', invitationId);

    // 9. Return success
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationId,
        email,
        role,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Invite] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to send invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
