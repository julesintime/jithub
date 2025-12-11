import { test, expect } from '@playwright/test';
import { authHelper } from '../fixtures/auth-fixtures';
import { dbHelper } from '../fixtures/database-helper';

test.describe('Logout Flow', () => {
  test.beforeEach(async () => {
    await dbHelper.cleanup();
  });

  test.afterEach(async () => {
    await dbHelper.cleanup();
  });

  test('should display sign out button when authenticated', async ({ page, context }) => {
    // Create user with organization
    const { user, organization } = await authHelper.createTestUser({
      emailVerified: true,
      withOrganization: true,
    });
    await authHelper.setAuthCookie(context, user.id, organization!.id);

    await page.goto('/dashboard');

    // Should see sign out button
    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    await expect(signOutButton).toBeVisible();
  });

  test('should logout and redirect to home', async ({ page, context }) => {
    // Create user with organization
    const { user, organization } = await authHelper.createTestUser({
      emailVerified: true,
      withOrganization: true,
    });
    await authHelper.setAuthCookie(context, user.id, organization!.id);

    await page.goto('/dashboard');

    // Click sign out
    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    await signOutButton.click();

    // Should redirect to home
    await page.waitForURL(/^\/$/, { timeout: 5000 });
  });

  test('should clear session after logout', async ({ page, context }) => {
    // Create user with organization
    const { user, organization } = await authHelper.createTestUser({
      emailVerified: true,
      withOrganization: true,
    });
    await authHelper.setAuthCookie(context, user.id, organization!.id);

    await page.goto('/dashboard');

    // Click sign out
    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    await signOutButton.click();

    // Wait for redirect
    await page.waitForURL(/^\/$/, { timeout: 5000 });

    // Verify session is cleared
    const session = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session');
      return res.ok ? res.json() : null;
    });

    expect(session?.user).toBeFalsy();
  });

  test('should not be able to access protected routes after logout', async ({ page, context }) => {
    // Create user with organization
    const { user, organization } = await authHelper.createTestUser({
      emailVerified: true,
      withOrganization: true,
    });
    await authHelper.setAuthCookie(context, user.id, organization!.id);

    await page.goto('/dashboard');

    // Click sign out
    const signOutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
    await signOutButton.click();

    // Wait for redirect
    await page.waitForURL(/^\/$/, { timeout: 5000 });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to home
    await page.waitForURL(/^\/$/, { timeout: 5000 });
  });
});
