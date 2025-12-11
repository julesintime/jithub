import { db } from '../../src/lib/db';
import { user, account, session, organization, member, invitation } from '../../src/lib/db/schema';
import { eq, like, or, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

/**
 * Generate a random ID for test entities
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Database helper for E2E tests
 * Provides utilities for creating test data and cleaning up after tests
 */
export class DatabaseHelper {
  /**
   * Create a test user with email/password account
   */
  async createUser(data: {
    email: string;
    password?: string;
    name?: string;
    emailVerified?: boolean;
  }) {
    const userId = generateId();
    const now = new Date();

    // Insert user
    const [newUser] = await db
      .insert(user)
      .values({
        id: userId,
        email: data.email,
        name: data.name || 'Test User',
        emailVerified: data.emailVerified ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Insert email/password account if password provided
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      await db.insert(account).values({
        id: generateId(),
        userId,
        accountId: data.email,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newUser;
  }

  /**
   * Create a test session for a user
   */
  async createSession(userId: string, activeOrganizationId?: string) {
    const sessionId = generateId();
    const token = generateId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [newSession] = await db
      .insert(session)
      .values({
        id: sessionId,
        userId,
        token,
        expiresAt,
        activeOrganizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Playwright E2E Test',
      })
      .returning();

    return { session: newSession, token };
  }

  /**
   * Create a test organization
   */
  async createOrganization(data: {
    name: string;
    slug: string;
    createdBy?: string;
  }) {
    const orgId = generateId();
    const now = new Date();

    const [newOrg] = await db
      .insert(organization)
      .values({
        id: orgId,
        name: data.name,
        slug: data.slug,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return newOrg;
  }

  /**
   * Add user to organization with role
   */
  async addMembership(
    userId: string,
    organizationId: string,
    role: 'owner' | 'admin' | 'member' = 'member'
  ) {
    const [newMember] = await db
      .insert(member)
      .values({
        id: generateId(),
        userId,
        organizationId,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newMember;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    return foundUser;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return foundUser;
  }

  /**
   * Get accounts by user ID
   */
  async getAccountsByUserId(userId: string) {
    return db.select().from(account).where(eq(account.userId, userId));
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string) {
    const [foundOrg] = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    return foundOrg;
  }

  /**
   * Get membership for user in organization
   */
  async getMembership(userId: string, organizationId: string) {
    const [foundMember] = await db
      .select()
      .from(member)
      .where(
        sql`${member.userId} = ${userId} AND ${member.organizationId} = ${organizationId}`
      )
      .limit(1);

    return foundMember;
  }

  /**
   * Clean up all test data
   * Deletes data matching test patterns (@example.com emails, test-* slugs)
   * Order: invitations -> members -> sessions -> accounts -> organizations -> users
   */
  async cleanup() {
    try {
      // Get test user IDs first
      const testUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(like(user.email, '%@example.com'));

      const testUserIds = testUsers.map((u) => u.id);

      // Delete invitations for test emails
      await db.delete(invitation).where(like(invitation.email, '%@example.com'));

      // Get test orgs (both by slug and by createdBy)
      const testOrgsBySlug = await db
        .select({ id: organization.id })
        .from(organization)
        .where(like(organization.slug, 'test-%'));

      // Get orgs created by test users
      const testOrgsByUser = testUserIds.length > 0
        ? await db
            .select({ id: organization.id })
            .from(organization)
            .where(sql`${organization.createdBy} IN (${sql.join(testUserIds.map(id => sql`${id}`), sql`, `)})`)
        : [];

      const allTestOrgIds = [
        ...testOrgsBySlug.map((o) => o.id),
        ...testOrgsByUser.map((o) => o.id),
      ];

      // Delete members for test orgs
      for (const orgId of allTestOrgIds) {
        await db.delete(member).where(eq(member.organizationId, orgId));
      }

      // Delete members, sessions, accounts for test users
      for (const userId of testUserIds) {
        await db.delete(member).where(eq(member.userId, userId));
        await db.delete(session).where(eq(session.userId, userId));
        await db.delete(account).where(eq(account.userId, userId));
      }

      // Delete test organizations BEFORE users (orgs reference users via created_by)
      for (const orgId of allTestOrgIds) {
        await db.delete(organization).where(eq(organization.id, orgId));
      }

      // Delete test users AFTER organizations
      await db.delete(user).where(like(user.email, '%@example.com'));
    } catch (error) {
      console.error('Cleanup error (non-fatal):', error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  }

  /**
   * Set user's email as verified
   */
  async setEmailVerified(email: string, verified: boolean = true) {
    await db
      .update(user)
      .set({ emailVerified: verified, updatedAt: new Date() })
      .where(eq(user.email, email));
  }
}

export const dbHelper = new DatabaseHelper();
