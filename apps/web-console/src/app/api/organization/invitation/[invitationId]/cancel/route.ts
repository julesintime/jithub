import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { member, invitation } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/organization/invitation/[invitationId]/cancel
 *
 * Cancel a pending invitation
 *
 * Note: This only updates the status in PostgreSQL.
 * Keycloak invitations cannot be cancelled once sent,
 * but marking as cancelled prevents UI confusion.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { invitationId: string } }
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

    const { invitationId } = params;

    // 2. Get invitation
    const inv = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, invitationId))
      .limit(1);

    if (inv.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const invData = inv[0];

    // 3. Check if user has permission (must be owner or admin of the organization)
    const membership = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, invData.organizationId),
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
        { error: 'Only organization owners and admins can cancel invitations' },
        { status: 403 }
      );
    }

    // 4. Check if invitation can be cancelled
    if (invData.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel invitation with status: ${invData.status}` },
        { status: 400 }
      );
    }

    // 5. Cancel the invitation
    await db
      .update(invitation)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(invitation.id, invitationId));

    console.log('[Cancel Invitation] Cancelled invitation:', invitationId);

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    console.error('[Cancel Invitation] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to cancel invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
