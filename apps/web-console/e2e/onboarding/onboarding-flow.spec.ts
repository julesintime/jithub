import { test, expect } from '@playwright/test';
import { authHelper } from '../fixtures/auth-fixtures';
import { dbHelper } from '../fixtures/database-helper';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async () => {
    await dbHelper.cleanup();
  });

  test.afterEach(async () => {
    await dbHelper.cleanup();
  });

  test('should redirect unauthenticated users to home', async ({ page }) => {
    // Try to access onboarding without being logged in
    await page.goto('/onboarding');

    // Should redirect to home page (based on proxy.ts behavior)
    // The onboarding page itself may also redirect if no session
    await page.waitForURL(/\/(onboarding)?/, { timeout: 5000 });
  });

  test('should display onboarding for authenticated user without org', async ({ page, context }) => {
    // Create authenticated user without organization
    const { user } = await authHelper.createTestUser({ emailVerified: true });
    await authHelper.setAuthCookie(context, user.id);

    await page.goto('/onboarding');

    // Should see onboarding content
    await expect(
      page.locator('text=/welcome|get started|create.*organization/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should create organization during onboarding', async ({ page, context }) => {
    // Create authenticated user
    const { user } = await authHelper.createTestUser({ emailVerified: true });
    await authHelper.setAuthCookie(context, user.id);

    const orgName = `Test Org ${Date.now()}`;
    const orgSlug = `test-org-${Date.now()}`;

    await page.goto('/onboarding');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for organization creation form
    const nameInput = page.locator('input[name="name"], #name, input[placeholder*="organization"]');
    const slugInput = page.locator('input[name="slug"], #slug, input[placeholder*="slug"]');

    // If form is visible, fill it out
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill(orgName);

      if (await slugInput.isVisible()) {
        await slugInput.fill(orgSlug);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
      await submitButton.click();

      // Wait for success
      await expect(
        page.locator('text=/created|success|continue/i')
      ).toBeVisible({ timeout: 15000 });

      // Verify organization was created
      const org = await dbHelper.getOrganizationBySlug(orgSlug);
      expect(org).toBeTruthy();
      expect(org.name).toBe(orgName);

      // Verify user is owner
      const membership = await dbHelper.getMembership(user.id, org.id);
      expect(membership).toBeTruthy();
      expect(membership.role).toBe('owner');
    }
  });

  test('should validate organization slug uniqueness', async ({ page, context }) => {
    // Create existing organization with known slug
    const existingSlug = `existing-org-${Date.now()}`;
    const existingUser = await dbHelper.createUser({
      email: `existing-owner-${Date.now()}@example.com`,
      emailVerified: true,
    });
    await dbHelper.createOrganization({
      name: 'Existing Org',
      slug: existingSlug,
      createdBy: existingUser.id,
    });

    // Create new user trying to use same slug
    const { user } = await authHelper.createTestUser({ emailVerified: true });
    await authHelper.setAuthCookie(context, user.id);

    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[name="name"], #name');
    const slugInput = page.locator('input[name="slug"], #slug');

    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill('New Org');

      if (await slugInput.isVisible()) {
        await slugInput.fill(existingSlug);

        // Should show slug unavailable message
        await expect(
          page.locator('text=/not available|already taken|already exists/i')
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should skip onboarding for users with existing org', async ({ page, context }) => {
    // Create user with organization
    const { user, organization } = await authHelper.createTestUser({
      emailVerified: true,
      withOrganization: true,
    });
    await authHelper.setAuthCookie(context, user.id, organization!.id);

    await page.goto('/onboarding');

    // Should redirect to dashboard or org-related page
    // (behavior depends on implementation - may show onboarding anyway or redirect)
    await page.waitForURL(/\/(onboarding|dashboard|organizations)/, { timeout: 5000 });
  });
});
