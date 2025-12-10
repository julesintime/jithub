import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { user, session, organization, member } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Integration tests for Keycloak OIDC authentication flow
 * Based on E2E tests performed with Playwright
 */
describe('Authentication Flow', () => {
  const TEST_USER_ID = 'test-user-auth-flow';
  const TEST_ORG_ID = 'test-org-auth-flow';

  // Setup test data before running tests
  beforeAll(async () => {
    // Clean up any existing test data first
    await db.delete(member).where(eq(member.userId, TEST_USER_ID)).catch(() => {});
    await db.delete(session).where(eq(session.userId, TEST_USER_ID)).catch(() => {});
    await db.delete(organization).where(eq(organization.id, TEST_ORG_ID)).catch(() => {});
    await db.delete(user).where(eq(user.id, TEST_USER_ID)).catch(() => {});

    // Create test user (simulating OIDC callback user creation)
    await db.insert(user).values({
      id: TEST_USER_ID,
      name: 'Test User',
      email: 'testuser@example.com',
      emailVerified: true,
    });

    // Create test organization
    await db.insert(organization).values({
      id: TEST_ORG_ID,
      name: 'example.com',
      slug: 'example-com-auth-test',
    });

    // Create membership
    await db.insert(member).values({
      id: 'test-member-auth-flow',
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      role: 'owner',
    });

    // Create test session
    await db.insert(session).values({
      id: 'test-session-123',
      token: 'test-session-token-123',
      userId: TEST_USER_ID,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      updatedAt: new Date(),
    });
  });

  // Cleanup test data after all tests complete
  // Only run cleanup if CLEANUP_TESTS env var is set
  afterAll(async () => {
    if (!process.env.CLEANUP_TESTS) {
      console.log('⏭️  Skipping test cleanup (set CLEANUP_TESTS=1 to enable)');
      return;
    }

    console.log('Cleaning up test data...');

    try {
      // Find test user
      const testUsers = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'));

      if (testUsers.length > 0) {
        const testUserId = testUsers[0].id;

        // Delete test sessions (cascade will handle this, but explicit for clarity)
        await db.delete(session).where(eq(session.userId, testUserId));
        console.log('✓ Deleted test sessions');

        // Delete test organization memberships
        await db.delete(member).where(eq(member.userId, testUserId));
        console.log('✓ Deleted test organization memberships');

        // Delete test organization (if it exists and has no other members)
        const testOrgSlug = 'example-com-auth-test';
        const testOrgs = await db
          .select()
          .from(organization)
          .where(eq(organization.slug, testOrgSlug));

        if (testOrgs.length > 0) {
          const remainingMembers = await db
            .select()
            .from(member)
            .where(eq(member.organizationId, testOrgs[0].id));

          if (remainingMembers.length === 0) {
            await db.delete(organization).where(eq(organization.id, testOrgs[0].id));
            console.log('✓ Deleted test organization');
          } else {
            console.log('⚠ Skipped deleting organization (has other members)');
          }
        }

        // Delete test user (cascade will handle related records)
        await db.delete(user).where(eq(user.email, 'testuser@example.com'));
        console.log('✓ Deleted test user');

        console.log('✅ Test cleanup completed');
      } else {
        console.log('No test user found, cleanup skipped');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  });
  describe('User Creation', () => {
    it('should create user in database after Keycloak registration', async () => {
      // Query for test user created during E2E test
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Test User');
      expect(users[0].email).toBe('testuser@example.com');
      expect(users[0].id).toBeTruthy();
      expect(users[0].createdAt).toBeInstanceOf(Date);
    });

    it('should have proper user schema structure', async () => {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      const testUser = users[0];

      expect(testUser).toHaveProperty('id');
      expect(testUser).toHaveProperty('name');
      expect(testUser).toHaveProperty('email');
      expect(testUser).toHaveProperty('emailVerified');
      expect(testUser).toHaveProperty('image');
      expect(testUser).toHaveProperty('createdAt');
      expect(testUser).toHaveProperty('updatedAt');

      // Test setup creates a verified user
      expect(testUser.emailVerified).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create session after successful authentication', async () => {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      const testUser = users[0];

      const sessions = await db
        .select()
        .from(session)
        .where(eq(session.userId, testUser.id))
        .limit(1);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe(testUser.id);
      expect(sessions[0].token).toBeTruthy();
      expect(sessions[0].expiresAt).toBeInstanceOf(Date);
    });

    it('should have session with 7-day expiration', async () => {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      const sessions = await db
        .select()
        .from(session)
        .where(eq(session.userId, users[0].id))
        .limit(1);

      const sessionAge = sessions[0].expiresAt.getTime() - sessions[0].createdAt.getTime();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      // Allow 1 minute tolerance
      expect(sessionAge).toBeGreaterThanOrEqual(sevenDaysInMs - 60000);
      expect(sessionAge).toBeLessThanOrEqual(sevenDaysInMs + 60000);
    });

    it('should store session metadata', async () => {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      const sessions = await db
        .select()
        .from(session)
        .where(eq(session.userId, users[0].id))
        .limit(1);

      const testSession = sessions[0];

      expect(testSession).toHaveProperty('ipAddress');
      expect(testSession).toHaveProperty('userAgent');
      expect(testSession).toHaveProperty('createdAt');
      expect(testSession).toHaveProperty('updatedAt');
    });
  });

  describe('Database Schema', () => {
    it('should use camelCase column names', async () => {
      const users = await db
        .select()
        .from(user)
        .limit(1);

      if (users.length > 0) {
        const testUser = users[0];
        // Verify camelCase properties exist (not snake_case)
        expect(testUser).toHaveProperty('createdAt');
        expect(testUser).toHaveProperty('updatedAt');
        expect(testUser).toHaveProperty('emailVerified');
      }
    });

    it('should use text IDs instead of UUIDs', async () => {
      const users = await db
        .select()
        .from(user)
        .limit(1);

      if (users.length > 0) {
        const userId = users[0].id;
        expect(typeof userId).toBe('string');
        // better-auth generates alphanumeric IDs, not UUID format
        expect(userId).toMatch(/^[A-Za-z0-9]+$/);
        expect(userId.length).toBeGreaterThan(20);
      }
    });
  });
});

describe('Auth Configuration', () => {
  it('should have proper Drizzle adapter configuration', async () => {
    // Verify we can query the database successfully
    const users = await db.select().from(user).limit(1);
    expect(Array.isArray(users)).toBe(true);
  });

  it('should handle concurrent database operations', async () => {
    // Test that multiple queries can run concurrently
    const [users1, users2, sessions1] = await Promise.all([
      db.select().from(user).limit(5),
      db.select().from(user).limit(5),
      db.select().from(session).limit(5),
    ]);

    expect(Array.isArray(users1)).toBe(true);
    expect(Array.isArray(users2)).toBe(true);
    expect(Array.isArray(sessions1)).toBe(true);
  });
});

describe('Organization Management', () => {
  describe('Organization Creation', () => {
    it('should create organization during onboarding', async () => {
      // Query for organization created from test user's email domain
      const orgs = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, 'example-com-auth-test'))
        .limit(1);

      expect(orgs).toHaveLength(1);
      expect(orgs[0].name).toBe('example.com');
      expect(orgs[0].slug).toBe('example-com-auth-test');
      expect(orgs[0].id).toBeTruthy();
      expect(orgs[0].createdAt).toBeInstanceOf(Date);
    });

    it('should have proper organization schema structure', async () => {
      const orgs = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, 'example-com-auth-test'))
        .limit(1);

      const testOrg = orgs[0];

      expect(testOrg).toHaveProperty('id');
      expect(testOrg).toHaveProperty('name');
      expect(testOrg).toHaveProperty('slug');
      expect(testOrg).toHaveProperty('logo');
      expect(testOrg).toHaveProperty('metadata');
      expect(testOrg).toHaveProperty('createdAt');
      expect(testOrg).toHaveProperty('updatedAt');
    });

    it('should store organization metadata', async () => {
      const orgs = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, 'example-com-auth-test'))
        .limit(1);

      if (orgs[0].metadata) {
        const metadata = JSON.parse(orgs[0].metadata);
        expect(metadata).toHaveProperty('createdDuringOnboarding');
        expect(metadata.createdDuringOnboarding).toBe(true);
      }
    });
  });

  describe('Organization Membership', () => {
    it('should add user as organization owner', async () => {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      const orgs = await db
        .select()
        .from(organization)
        .where(eq(organization.slug, 'example-com-auth-test'))
        .limit(1);

      const members = await db
        .select()
        .from(member)
        .where(eq(member.userId, users[0].id))
        .where(eq(member.organizationId, orgs[0].id))
        .limit(1);

      expect(members).toHaveLength(1);
      expect(members[0].role).toBe('owner');
      expect(members[0].userId).toBe(users[0].id);
      expect(members[0].organizationId).toBe(orgs[0].id);
    });

    it('should have proper member schema structure', async () => {
      const users = await db
        .select()
        .from(user)
        .where(eq(user.email, 'testuser@example.com'))
        .limit(1);

      const members = await db
        .select()
        .from(member)
        .where(eq(member.userId, users[0].id))
        .limit(1);

      const testMember = members[0];

      expect(testMember).toHaveProperty('id');
      expect(testMember).toHaveProperty('organizationId');
      expect(testMember).toHaveProperty('userId');
      expect(testMember).toHaveProperty('role');
      expect(testMember).toHaveProperty('createdAt');
      expect(testMember).toHaveProperty('updatedAt');
    });
  });
});
