import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { organization, member } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'better-auth';

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract organization details from user email
    const emailDomain = session.user.email.split('@')[1];
    const orgSlug = emailDomain.replace(/\./g, '-');
    const orgName = emailDomain;

    // Check if organization already exists
    const existingOrg = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, orgSlug))
      .limit(1);

    let org;
    if (existingOrg.length > 0) {
      org = existingOrg[0];
      console.log('Organization already exists:', org.id);
    } else {
      // Create organization
      const newOrg = await db
        .insert(organization)
        .values({
          id: generateId(),
          name: orgName,
          slug: orgSlug,
          metadata: JSON.stringify({
            createdDuringOnboarding: true,
            createdAt: new Date().toISOString(),
          }),
        })
        .returning();

      org = newOrg[0];
      console.log('Created organization:', org.id);
    }

    // Check if user is already a member
    const existingMember = await db
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id))
      .where(eq(member.organizationId, org.id))
      .limit(1);

    if (existingMember.length === 0) {
      // Add user as organization owner
      await db.insert(member).values({
        id: generateId(),
        organizationId: org.id,
        userId: session.user.id,
        role: 'owner',
      });
      console.log('Added user as organization owner');
    } else {
      console.log('User already a member of organization');
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed',
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
