import { test, expect } from '@playwright/test';
import { authHelper } from '../fixtures/auth-fixtures';
import { dbHelper } from '../fixtures/database-helper';

test.describe('Protected Routes & Auth Guards', () => {
  test.beforeEach(async () => {
    await dbHelper.cleanup();
  });

  test.afterEach(async () => {
    await dbHelper.cleanup();
  });

  test.describe('Unauthenticated Access', () => {
    test('should allow access to public routes', async ({ page }) => {
      // Home page
      await page.goto('/');
      await expect(page).toHaveURL('/');

      // Login page
      await page.goto('/login');
      await expect(page).toHaveURL('/login');

      // Signup page
      await page.goto('/signup');
      await expect(page).toHaveURL('/signup');

      // Forgot password
      await page.goto('/forgot-password');
      await expect(page).toHaveURL('/forgot-password');
    });

    test('should redirect from dashboard to home when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to home page
      await page.waitForURL(/^\/$/, { timeout: 5000 });
    });

    test('should redirect from settings to home when not authenticated', async ({ page }) => {
      await page.goto('/settings/accounts');

      // Should redirect to home page
      await page.waitForURL(/^\/$/, { timeout: 5000 });
    });

    test('should allow access to onboarding (public route)', async ({ page }) => {
      await page.goto('/onboarding');

      // Onboarding is a public route, should not redirect
      await expect(page).toHaveURL('/onboarding');
    });
  });

  test.describe('Authenticated Access', () => {
    test('should allow authenticated user to access dashboard', async ({ page, context }) => {
      // Create user with organization
      const { user, organization } = await authHelper.createTestUser({
        emailVerified: true,
        withOrganization: true,
      });
      await authHelper.setAuthCookie(context, user.id, organization!.id);

      await page.goto('/dashboard');

      // Should stay on dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should redirect to org selection if user has no active org', async ({ page, context }) => {
      // Create user without organization
      const { user } = await authHelper.createTestUser({ emailVerified: true });
      await authHelper.setAuthCookie(context, user.id); // No activeOrganizationId

      await page.goto('/dashboard');

      // Should redirect to organization selection
      await page.waitForURL(/\/(organizations\/select|onboarding)/, { timeout: 5000 });
    });

    test('should allow access to settings when authenticated', async ({ page, context }) => {
      // Create user with organization
      const { user, organization } = await authHelper.createTestUser({
        emailVerified: true,
        withOrganization: true,
      });
      await authHelper.setAuthCookie(context, user.id, organization!.id);

      await page.goto('/settings/accounts');

      // Should stay on settings page
      await expect(page).toHaveURL('/settings/accounts');
    });
  });

  test.describe('API Route Protection', () => {
    test('should return 403 for protected API without auth', async ({ request }) => {
      // Try to access a protected API endpoint
      const response = await request.get('/api/organization/list');

      // Should return 401 or 403
      expect([401, 403]).toContain(response.status());
    });

    test('should return 403 for protected API without active org', async ({ page, context }) => {
      // Create user without organization
      const { user } = await authHelper.createTestUser({ emailVerified: true });
      await authHelper.setAuthCookie(context, user.id); // No activeOrganizationId

      // Make API request from page context
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/organization/list');
        return { status: res.status, ok: res.ok };
      });

      // Should return 403 (no active organization)
      expect(response.status).toBe(403);
    });

    test('should allow protected API with valid auth and org', async ({ page, context }) => {
      // Create user with organization
      const { user, organization } = await authHelper.createTestUser({
        emailVerified: true,
        withOrganization: true,
      });
      await authHelper.setAuthCookie(context, user.id, organization!.id);

      // Navigate to a page first to set cookies
      await page.goto('/');

      // Make API request from page context
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/get-session');
        return { status: res.status, ok: res.ok };
      });

      // Should return 200
      expect(response.ok).toBe(true);
    });
  });

  test.describe('Session Expiry', () => {
    test('should redirect when session expires', async ({ page, context }) => {
      // Create user and set expired cookie (by not creating session in DB)
      const { user } = await authHelper.createTestUser({ emailVerified: true });

      // Set a fake session cookie that doesn't exist in DB
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: 'invalid-session-token',
          domain: 'localhost',
          path: '/',
          expires: Math.floor(Date.now() / 1000) + 3600,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ]);

      await page.goto('/dashboard');

      // Should redirect to home (invalid session)
      await page.waitForURL(/^\/$/, { timeout: 5000 });
    });
  });
});
