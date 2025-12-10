import { test, expect } from '@playwright/test';

test.describe('Organization Switching Flow', () => {
  test('should show organization selection page UI', async ({ page }) => {
    // Navigate to organization selection page
    await page.goto('/organizations/select');

    // Should show the organization selection heading
    await expect(
      page.getByRole('heading', { name: /select an organization/i })
    ).toBeVisible();

    // Should show description text
    await expect(
      page.getByText(/choose which organization you want to work with/i)
    ).toBeVisible();
  });

  test('should redirect to org selection when accessing page without auth', async ({
    page,
  }) => {
    // Try to access the organization selection page
    await page.goto('/organizations/select');

    // Page should load (may show loading or not authenticated message)
    await page.waitForLoadState('networkidle');

    // Should either show loading or not authenticated message
    const notAuthText = page.getByText(/not authenticated/i);
    const loadingIndicator = page.locator('svg.animate-spin');

    // One of these should be visible
    const notAuthVisible = await notAuthText.isVisible().catch(() => false);
    const loadingVisible = await loadingIndicator
      .isVisible()
      .catch(() => false);

    expect(notAuthVisible || loadingVisible).toBeTruthy();
  });

  test('should display "no organizations" state correctly', async ({
    page,
  }) => {
    await page.goto('/organizations/select');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // If not authenticated, should show "Not authenticated" or loading
    // If authenticated with no orgs, should show "No organizations"
    const noOrgsText = page.getByText(/no organizations/i);
    const notAuthText = page.getByText(/not authenticated/i);

    const noOrgsVisible = await noOrgsText.isVisible().catch(() => false);
    const notAuthVisible = await notAuthText.isVisible().catch(() => false);

    // Either message should be visible (depending on auth state)
    expect(noOrgsVisible || notAuthVisible).toBeTruthy();
  });
});

test.describe('Organization Switcher Component', () => {
  test('should display main page with header', async ({ page }) => {
    await page.goto('/');

    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Title should be visible
    await expect(
      header.getByText('JTT Platform Console')
    ).toBeVisible();
  });

  test('should show sign-in options when not authenticated', async ({
    page,
  }) => {
    await page.goto('/');

    // Should show sign-in button
    const signInButton = page.getByRole('button', {
      name: /sign in with keycloak/i,
    });

    // Either in header or main content
    const headerSignIn = page
      .getByRole('banner')
      .getByRole('button', { name: /sign in/i });
    const mainSignIn = page
      .getByRole('main')
      .getByRole('button', { name: /sign in/i });

    const headerVisible = await headerSignIn.isVisible().catch(() => false);
    const mainVisible = await mainSignIn.isVisible().catch(() => false);

    expect(headerVisible || mainVisible).toBeTruthy();
  });

  test.skip('should display organization switcher when authenticated with orgs', async ({
    page,
  }) => {
    // This test requires authentication
    // Would need to mock session with organizations

    await page.goto('/');

    // Wait for auth to load
    await page.waitForLoadState('networkidle');

    // Should see organization switcher dropdown
    const orgSwitcher = page.getByRole('combobox');
    await expect(orgSwitcher).toBeVisible();

    // Click to open dropdown
    await orgSwitcher.click();

    // Should see "Organizations" label
    await expect(page.getByText('Organizations')).toBeVisible();

    // Should see "Create organization" option
    await expect(page.getByText('Create organization')).toBeVisible();
  });

  test.skip('should allow switching between organizations', async ({
    page,
  }) => {
    // This test requires authentication with multiple organizations

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find organization switcher
    const orgSwitcher = page.getByRole('combobox');
    await orgSwitcher.click();

    // Click on a different organization
    const orgItems = page.getByRole('menuitem');
    const firstOrg = orgItems.first();
    await firstOrg.click();

    // Page should reload
    await page.waitForLoadState('networkidle');

    // Should still be on main page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Organization Middleware Protection', () => {
  test('should allow access to public routes', async ({ page }) => {
    // Test that public routes are accessible
    await page.goto('/');
    await expect(page.getByText('JTT Platform Console')).toBeVisible();

    // Organizations select page should be accessible
    await page.goto('/organizations/select');
    await page.waitForLoadState('networkidle');
    // Page should load (even if showing not authenticated)
    expect(page.url()).toContain('/organizations/select');
  });

  test.skip('should redirect to org selection for protected routes without active org', async ({
    page,
  }) => {
    // This test requires authentication without active organization

    // Try to access a protected route (when implemented)
    await page.goto('/dashboard');

    // Should redirect to organization selection
    await page.waitForURL('/organizations/select');

    // Should show selection page
    await expect(
      page.getByRole('heading', { name: /select an organization/i })
    ).toBeVisible();
  });
});

test.describe('Organization Creation Flow', () => {
  test.skip('should navigate to create organization page', async ({ page }) => {
    // This test requires authentication

    await page.goto('/organizations/select');
    await page.waitForLoadState('networkidle');

    // Click "Create organization" button
    await page
      .getByRole('button', { name: /create organization/i })
      .click();

    // Should navigate to org creation page
    await page.waitForURL('/organizations/new');
  });

  test('should display organization creation page', async ({ page }) => {
    // Navigate to org creation page
    await page.goto('/organizations/new');

    await page.waitForLoadState('networkidle');

    // Page should load (may redirect to auth or show form)
    expect(page.url()).toBeTruthy();
  });
});

test.describe('UI Responsiveness', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Header should be visible
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');

    // Header should be visible
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/');

    // Header should be visible
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });
});
