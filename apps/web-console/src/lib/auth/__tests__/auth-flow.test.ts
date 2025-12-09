import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../db';
import { user, session } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Integration tests for Keycloak OIDC authentication flow
 * Based on E2E tests performed with Playwright
 */
describe('Authentication Flow', () => {
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

      // Email should not be verified on initial registration
      expect(testUser.emailVerified).toBe(false);
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
