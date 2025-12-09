import { test, expect } from '@playwright/test';

test.describe('Onboarding Page (Unauthenticated)', () => {
  test('should redirect to home when not authenticated', async ({ page }) => {
    await page.goto('/onboarding');

    // Should redirect to home page
    await page.waitForURL('/');

    // Should show sign-in button
    await expect(
      page.getByRole('button', { name: /sign in with keycloak/i })
    ).toBeVisible();
  });
});

test.describe('Onboarding Components', () => {
  test.skip('should display all onboarding steps', async ({ page }) => {
    // This test requires authentication
    // We would need to mock the session or use test auth
    await page.goto('/onboarding');

    // Verify step indicators
    await expect(page.getByText('Step 1 of 4')).toBeVisible();
  });

  test.skip('should navigate through onboarding steps', async ({ page }) => {
    // This test requires authentication
    await page.goto('/onboarding');

    // Click Next button
    await page.getByRole('button', { name: /next/i }).click();

    // Should be on step 2
    await expect(page.getByText('Step 2 of 4')).toBeVisible();
  });

  test.skip('should complete onboarding and redirect', async ({ page }) => {
    // This test requires authentication
    await page.goto('/onboarding');

    // Navigate to last step
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /next/i }).click();
    }

    // Click Get Started
    await page.getByRole('button', { name: /get started/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('/');
  });
});
