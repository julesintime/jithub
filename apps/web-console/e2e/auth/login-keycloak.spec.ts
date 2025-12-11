import { test, expect } from '@playwright/test';
import { dbHelper } from '../fixtures/database-helper';
import { keycloakHelper } from '../fixtures/keycloak-helper';

test.describe('Keycloak SSO Login Flow', () => {
  // These tests require Keycloak to be running and configured
  // Skip if Keycloak environment variables are not set
  const keycloakConfigured = Boolean(
    process.env.KEYCLOAK_URL &&
    process.env.KEYCLOAK_CLIENT_ID &&
    process.env.KEYCLOAK_CLIENT_SECRET
  );

  test.beforeEach(async () => {
    await dbHelper.cleanup();
  });

  test.afterEach(async () => {
    await dbHelper.cleanup();
  });

  test('should display SSO button on login page', async ({ page }) => {
    await page.goto('/login');

    // Check SSO button exists
    const ssoButton = page.locator('button:has-text("SSO"), button:has-text("Keycloak")');
    await expect(ssoButton).toBeVisible();
  });

  test('should display SSO button on signup page', async ({ page }) => {
    await page.goto('/signup');

    // Check SSO button exists
    const ssoButton = page.locator('button:has-text("SSO"), button:has-text("Keycloak")');
    await expect(ssoButton).toBeVisible();
  });

  test.describe('With Keycloak', () => {
    // Skip all tests in this group if Keycloak is not configured
    test.skip(!keycloakConfigured, 'Keycloak environment not configured');

    let keycloakTestUser: {
      keycloakUserId: string;
      credentials: { username: string; email: string; password: string };
    };

    test.beforeAll(async () => {
      // Create a test user in Keycloak
      try {
        keycloakTestUser = await keycloakHelper.createTestUser();
      } catch (error) {
        console.log('Failed to create Keycloak test user:', error);
      }
    });

    test.afterAll(async () => {
      // Clean up Keycloak test user
      if (keycloakTestUser?.keycloakUserId) {
        try {
          await keycloakHelper.deleteUser(keycloakTestUser.keycloakUserId);
        } catch (error) {
          console.log('Failed to delete Keycloak test user:', error);
        }
      }
    });

    test('should redirect to Keycloak when clicking SSO button', async ({ page }) => {
      await page.goto('/login');

      // Click SSO button
      const ssoButton = page.locator('button:has-text("SSO"), button:has-text("Keycloak")');
      await ssoButton.click();

      // Should redirect to Keycloak login page
      await expect(page).toHaveURL(/keycloak|auth.*realms/, { timeout: 10000 });
    });

    test('should create user account after SSO login', async ({ page }) => {
      test.skip(!keycloakTestUser, 'Keycloak test user not created');

      await page.goto('/login');

      // Click SSO button
      const ssoButton = page.locator('button:has-text("SSO"), button:has-text("Keycloak")');
      await ssoButton.click();

      // Complete Keycloak login
      await keycloakHelper.login(
        page,
        keycloakTestUser.credentials.username,
        keycloakTestUser.credentials.password
      );

      // Should redirect back to app
      await page.waitForURL(/localhost:300[0-9]/, { timeout: 15000 });

      // Should be on onboarding (new user) or dashboard (returning user)
      await expect(page).toHaveURL(/\/(onboarding|dashboard|organizations)/);

      // Verify user was created in database
      const user = await dbHelper.getUserByEmail(keycloakTestUser.credentials.email);
      expect(user).toBeTruthy();
      expect(user.emailVerified).toBe(true); // Keycloak users are trusted as verified

      // Verify Keycloak account was linked
      const accounts = await dbHelper.getAccountsByUserId(user.id);
      const keycloakAccount = accounts.find((a) => a.providerId === 'keycloak');
      expect(keycloakAccount).toBeTruthy();
    });

    test('should login existing user with SSO', async ({ page }) => {
      test.skip(!keycloakTestUser, 'Keycloak test user not created');

      // Create existing user with same email (simulate previous login)
      const existingUser = await dbHelper.createUser({
        email: keycloakTestUser.credentials.email,
        name: 'Existing SSO User',
        emailVerified: true,
      });

      await page.goto('/login');

      // Click SSO button
      const ssoButton = page.locator('button:has-text("SSO"), button:has-text("Keycloak")');
      await ssoButton.click();

      // Complete Keycloak login
      await keycloakHelper.login(
        page,
        keycloakTestUser.credentials.username,
        keycloakTestUser.credentials.password
      );

      // Should redirect back to app
      await page.waitForURL(/localhost:300[0-9]/, { timeout: 15000 });

      // Verify session is for the existing user (account linking)
      const session = await page.evaluate(async () => {
        const res = await fetch('/api/auth/get-session');
        return res.ok ? res.json() : null;
      });

      // Should be logged in as the existing user (accounts linked)
      expect(session?.user?.email).toBe(keycloakTestUser.credentials.email);
    });
  });
});
