import { db } from '../lib/db';
import { user, session, organization, member } from '../lib/db/schema';
import { generateId } from 'better-auth';
import { eq } from 'drizzle-orm';

/**
 * Setup test data for integration tests
 * Creates a test user, session, organization, and membership
 */
async function setupTestData() {
  console.log('Setting up test data...');

  try {
    // Check if test user already exists
    const existingUsers = await db
      .select()
      .from(user)
      .where(eq(user.email, 'testuser@example.com'));

    let testUser;
    if (existingUsers.length > 0) {
      testUser = existingUsers[0];
      console.log('✓ Test user already exists:', testUser.id);
    } else {
      // Create test user
      const now = new Date();
      const newUser = await db
        .insert(user)
        .values({
          id: generateId(),
          name: 'Test User',
          email: 'testuser@example.com',
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      testUser = newUser[0];
      console.log('✓ Created test user:', testUser.id);
    }

    // Check if test session exists
    const existingSessions = await db
      .select()
      .from(session)
      .where(eq(session.userId, testUser.id));

    if (existingSessions.length === 0) {
      // Create test session (7-day expiration)
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(session).values({
        id: generateId(),
        userId: testUser.id,
        token: generateId(),
        expiresAt,
        createdAt: now,
        updatedAt: now,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      });
      console.log('✓ Created test session');
    } else {
      console.log('✓ Test session already exists');
    }

    // Check if test organization exists
    const orgSlug = 'example-com';
    const existingOrgs = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, orgSlug));

    let testOrg;
    if (existingOrgs.length > 0) {
      testOrg = existingOrgs[0];
      console.log('✓ Test organization already exists:', testOrg.id);
    } else {
      // Create test organization
      const now = new Date();
      const newOrg = await db
        .insert(organization)
        .values({
          id: generateId(),
          name: 'example.com',
          slug: orgSlug,
          createdAt: now,
          updatedAt: now,
          metadata: JSON.stringify({
            createdDuringOnboarding: true,
            createdAt: now.toISOString(),
          }),
        })
        .returning();

      testOrg = newOrg[0];
      console.log('✓ Created test organization:', testOrg.id);
    }

    // Check if test membership exists
    const existingMembers = await db
      .select()
      .from(member)
      .where(eq(member.userId, testUser.id))
      .where(eq(member.organizationId, testOrg.id));

    if (existingMembers.length === 0) {
      // Create test membership
      const now = new Date();
      await db.insert(member).values({
        id: generateId(),
        organizationId: testOrg.id,
        userId: testUser.id,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      });
      console.log('✓ Created test membership (owner role)');
    } else {
      console.log('✓ Test membership already exists');
    }

    console.log('\n✅ Test data setup completed successfully!');
    console.log('\nTest Data Summary:');
    console.log('- User:', testUser.email, `(ID: ${testUser.id})`);
    console.log('- Organization:', testOrg.name, `(Slug: ${testOrg.slug})`);
    console.log('- Role: owner');
  } catch (error) {
    console.error('Error setting up test data:', error);
    throw error;
  }
}

setupTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
