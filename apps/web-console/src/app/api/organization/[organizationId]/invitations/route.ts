import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organization, member, invitation } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/organization/[organizationId]/invitations
 *
 * List all invitations for an organization
 *
 * Query Parameters:
 * - status: Filter by status (pending/accepted/expired) - optional
 *
 * Returns:
 * - Array of invitations with inviter information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    // 1. Validate user session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { organizationId } = params;

    // 2. Verify organization exists
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

    // 3. Check if user is a member of the organization
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

    // 4. Get query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // 5. Build query
    let query = db
      .select({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        createdAt: invitation.createdAt,
        inviterId: invitation.inviterId,
      })
      .from(invitation)
      .where(eq(invitation.organizationId, organizationId));

    // Apply status filter if provided
    if (statusFilter && ['pending', 'accepted', 'expired'].includes(statusFilter)) {
      query = query.where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.status, statusFilter)
        )
      ) as any;
    }

    const invitations = await query;

    // 6. Return invitations
    return NextResponse.json({
      invitations,
      total: invitations.length,
    });
  } catch (error) {
    console.error('[List Invitations] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to list invitations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
