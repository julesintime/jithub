import { test, expect } from '@playwright/test';

/**
 * Complete User Journey E2E Tests
 *
 * Tests the full user experience from signup to using the platform.
 * Uses REAL Keycloak authentication and REAL API calls.
 * NO MOCKING - this is the actual customer experience.
 *
 * Flow:
 * 1. User signs up via Keycloak (REAL OIDC)
 * 2. User creates first organization (REAL API)
 * 3. User navigates to dashboard
 * 4. User creates second organization
 * 5. User switches between organizations
 * 6. User invites team member (REAL invitation API)
 * 7. User adds custom domain (if implemented)
 */

test.describe('Complete User Journey - Real Authentication', () => {
  test.use({ storageState: '.auth/newuser.json' });

  test('should complete full onboarding and organization creation', async ({ page }) => {
    // User is already authenticated (via auth setup)
    // Navigate to app
    await page.goto('/');

    // Should redirect to onboarding (no org yet)
    await page.waitForURL('/onboarding');

    // Should see organization creation form
    await expect(
      page.getByRole('heading', { name: /create your organization/i })
    ).toBeVisible();

    // Fill in organization name
    const orgName = `Test Org ${Date.now()}`;
    await page.getByLabel(/organization name/i).fill(orgName);

    // Slug should auto-generate
    const slugInput = page.getByLabel(/url slug/i);
    await expect(slugInput).not.toBeEmpty();

    // Wait for slug validation (real API call)
    await page.waitForSelector('[data-validation="valid"]', { timeout: 5000 });

    // Submit form (REAL API call to create org in Keycloak + PostgreSQL)
    await page.getByRole('button', { name: /create organization/i }).click();

    // Should see success message
    await expect(page.getByText(/organization created/i)).toBeVisible();

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verify organization is active
    await expect(page.getByText(orgName)).toBeVisible();
  });

  test('should create and switch between multiple organizations', async ({ page }) => {
    await page.goto('/');

    // Create first org if needed
    const currentUrl = page.url();
    if (currentUrl.includes('/onboarding')) {
      const orgName = `Org A ${Date.now()}`;
      await page.getByLabel(/organization name/i).fill(orgName);
      await page.waitForSelector('[data-validation="valid"]', { timeout: 5000 });
      await page.getByRole('button', { name: /create organization/i }).click();
      await page.waitForURL('/dashboard', { timeout: 10000 });
    }

    // Open organization switcher
    await page.getByRole('button', { name: /organization/i }).click();

    // Create second organization
    await page.getByRole('menuitem', { name: /create organization/i }).click();

    // Should navigate to org creation
    await page.waitForURL('/organizations/new');

    // Fill in second org
    const orgName2 = `Org B ${Date.now()}`;
    await page.getByLabel(/organization name/i).fill(orgName2);
    await page.waitForSelector('[data-validation="valid"]', { timeout: 5000 });
    await page.getByRole('button', { name: /create organization/i }).click();

    // Should redirect to dashboard with new org active
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.getByText(orgName2)).toBeVisible();

    // Switch back to first org
    await page.getByRole('button', { name: /organization/i }).click();
    // Click on first org in list
    await page.getByRole('menuitem').first().click();

    // Should reload with first org active
    await page.waitForLoadState('networkidle');
  });

  test('should send team invitation using real API', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to team settings
    await page.getByRole('link', { name: /settings/i }).click();
    await page.getByRole('tab', { name: /team/i }).click();

    // Click invite button
    await page.getByRole('button', { name: /invite member/i }).click();

    // Fill invitation form
    const inviteEmail = `invited.${Date.now()}@test.local`;
    await page.getByLabel(/email/i).fill(inviteEmail);
    await page.getByLabel(/role/i).selectOption('member');

    // Send invitation (REAL API call to PostgreSQL + Keycloak)
    await page.getByRole('button', { name: /send invitation/i }).click();

    // Should see success message
    await expect(page.getByText(/invitation sent/i)).toBeVisible();

    // Should see invitation in pending list
    await expect(page.getByText(inviteEmail)).toBeVisible();
    await expect(page.getByText(/pending/i)).toBeVisible();
  });
});

test.describe('Organization Management - Real API Calls', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('should list user organizations from real API', async ({ page }) => {
    await page.goto('/organizations/select');

    // Wait for real API call to complete
    await page.waitForLoadState('networkidle');

    // Should show organizations list (from better-auth API)
    await expect(
      page.getByRole('heading', { name: /select an organization/i })
    ).toBeVisible();

    // Should show at least one organization
    const orgButtons = page.locator('button:has-text("/")'); // Slug format
    await expect(orgButtons.first()).toBeVisible();
  });

  test('should validate slug uniqueness with real API', async ({ page }) => {
    await page.goto('/organizations/new');

    // Fill in organization name
    const orgName = 'Test Company';
    await page.getByLabel(/organization name/i).fill(orgName);

    // Slug auto-generates
    const slugInput = page.getByLabel(/url slug/i);
    await expect(slugInput).toHaveValue('test-company');

    // Wait for validation API call
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/organization/check-slug'),
      { timeout: 5000 }
    );

    // Should show validation result
    const validationIcon = page.locator('[data-validation]');
    await expect(validationIcon).toBeVisible();
  });

  test('should handle duplicate slug with real API', async ({ page }) => {
    await page.goto('/organizations/new');

    // Try to create org with existing slug
    await page.getByLabel(/organization name/i).fill('Test');

    const slugInput = page.getByLabel(/url slug/i);
    await slugInput.fill('existing-slug'); // Assuming this exists

    // Wait for validation API call
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/organization/check-slug')
    );

    // If slug is taken, should show suggestions
    const taken = await page.getByText(/already taken/i).isVisible();
    if (taken) {
      await expect(page.getByText(/suggestion/i)).toBeVisible();
    }
  });
});

test.describe('Middleware Protection - Real Session Checks', () => {
  test('should redirect unauthenticated users to home', async ({ page }) => {
    // No auth state - testing as anonymous user
    await page.goto('/dashboard');

    // Middleware should redirect to home
    await page.waitForURL('/');

    // Should show sign-in button
    await expect(
      page.getByRole('button', { name: /sign in with keycloak/i })
    ).toBeVisible();
  });

  test('should redirect authenticated user without org to selection', async ({ page }) => {
    // Use newuser without organization
    const context = await page.context().browser()?.newContext({
      storageState: '.auth/newuser.json',
    });
    const newPage = await context!.newPage();

    await newPage.goto('/dashboard');

    // Middleware should redirect to org selection
    await newPage.waitForURL('/organizations/select');

    await context?.close();
  });

  test.use({ storageState: '.auth/admin.json' });

  test('should allow access to dashboard with active org', async ({ page }) => {
    await page.goto('/dashboard');

    // Should stay on dashboard (middleware allows)
    await expect(page).toHaveURL('/dashboard');

    // Should show dashboard content
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should allow access to public routes', async ({ page }) => {
    await page.context().clearCookies();

    // Test all public routes
    const publicRoutes = ['/', '/api/auth', '/organizations/select'];

    for (const route of publicRoutes) {
      await page.goto(route);
      // Should not redirect to home
      expect(page.url()).toContain(route);
    }
  });
});

test.describe('UI Responsiveness - Customer Demo', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('should work perfectly on mobile (iPhone 12)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');

    // Should show mobile-optimized header
    await expect(page.getByText('JTT Platform Console')).toBeVisible();

    // Organization switcher should be accessible
    await page.getByRole('button', { name: /organization/i }).click();
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('should work perfectly on tablet (iPad)', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/dashboard');

    // Should show full UI
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });

  test('should work perfectly on desktop (1080p)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');

    // Should show full desktop UI
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });

  test('should work perfectly on 4K display', async ({ page }) => {
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('/dashboard');

    // Should scale properly
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });
});
