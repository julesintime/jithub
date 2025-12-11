import { test, expect } from '@playwright/test';
import { dbHelper } from '../fixtures/database-helper';

test.describe('Email Login Flow', () => {
  const testEmail = `login-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Login Test User';

  test.beforeAll(async () => {
    // Create a verified test user
    await dbHelper.createUser({
      email: testEmail,
      password: testPassword,
      name: testName,
      emailVerified: true,
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    await dbHelper.cleanup();
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page elements
    await expect(page.locator('h1, h2').filter({ hasText: /sign in/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check SSO button
    await expect(page.locator('button:has-text("SSO"), button:has-text("Keycloak")')).toBeVisible();

    // Check forgot password link
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();

    // Check link to signup
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or onboarding
    await page.waitForURL(/\/(dashboard|onboarding|organizations)/, { timeout: 15000 });

    // Verify we're logged in by checking session exists
    const session = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session');
      return res.ok ? res.json() : null;
    });

    expect(session?.user?.email).toBe(testEmail);
  });

  test('should show error with wrong password', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with wrong password
    await page.fill('#email', testEmail);
    await page.fill('#password', 'WrongPassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=/invalid|incorrect|wrong|failed/i')
    ).toBeVisible({ timeout: 10000 });

    // Should still be on login page
    expect(page.url()).toContain('/login');
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with non-existent email
    await page.fill('#email', 'nonexistent@example.com');
    await page.fill('#password', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=/invalid|not found|incorrect|failed/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show error for unverified email', async ({ page }) => {
    // Create unverified user
    const unverifiedEmail = `unverified-${Date.now()}@example.com`;
    await dbHelper.createUser({
      email: unverifiedEmail,
      password: testPassword,
      name: 'Unverified User',
      emailVerified: false,
    });

    await page.goto('/login');

    // Try to login
    await page.fill('#email', unverifiedEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Should show error about unverified email OR redirect to verification page
    // (depends on auth configuration)
    await expect(
      page.locator('text=/verify|not verified|verification/i').or(
        page.locator('text=/invalid|incorrect/i')
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.click('a[href="/forgot-password"]');

    // Should be on forgot password page
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.locator('h1, h2').filter({ hasText: /forgot password/i })).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');

    // Click signup link
    await page.click('a[href="/signup"]');

    // Should be on signup page
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h1, h2').filter({ hasText: /create account/i })).toBeVisible();
  });
});
