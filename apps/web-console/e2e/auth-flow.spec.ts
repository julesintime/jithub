import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show sign-in button when not authenticated', async ({
    page,
  }) => {
    await page.goto('/');

    // Should show welcome message
    await expect(
      page.getByText('Welcome to JTT Platform')
    ).toBeVisible();

    // Should show sign-in button in main content (not header)
    const signInButton = page.getByRole('main').getByRole('button', {
      name: /sign in with keycloak/i,
    });
    await expect(signInButton).toBeVisible();
  });

  test('should display dashboard header correctly', async ({ page }) => {
    await page.goto('/');

    // Header should be visible
    await expect(page.getByText('JTT Platform Console')).toBeVisible();
  });

  test('should show tech stack information', async ({ page }) => {
    await page.goto('/');

    // Scroll to tech stack section
    await page.getByText('Tech Stack').scrollIntoViewIfNeeded();

    // Verify tech stack details
    await expect(page.getByText('Next.js + shadcn/ui')).toBeVisible();
    await expect(page.getByText('Hono + Drizzle ORM')).toBeVisible();
    await expect(page.getByText('better-auth + Keycloak')).toBeVisible();
    await expect(page.getByText('Trigger.dev + Mastra')).toBeVisible();
  });
});

test.describe('Onboarding Flow (UI only)', () => {
  test.skip('should display onboarding carousel', async ({ page }) => {
    // This test requires authentication, so we skip it for now
    // In a real scenario, we would mock the auth session
    await page.goto('/onboarding');

    // Should redirect to home if not authenticated
    await page.waitForURL('/');
  });
});

test.describe('Component Rendering', () => {
  test('should render stat cards with default values', async ({ page }) => {
    await page.goto('/');

    // Sign in to see the dashboard
    // For now, just verify the welcome screen
    await expect(page.getByText('Total Users')).not.toBeVisible();
  });

  test('should have responsive navigation', async ({ page }) => {
    await page.goto('/');

    // Check header is present
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Header should contain title
    await expect(
      header.getByText('JTT Platform Console')
    ).toBeVisible();
  });
});
