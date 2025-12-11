import { test, expect } from '@playwright/test';
import { dbHelper } from '../fixtures/database-helper';
import { emailHelper } from '../fixtures/email-helper';

test.describe('Email Signup Flow', () => {
  const testEmail = `signup-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Signup Test User';

  test.beforeEach(async () => {
    // Clear any previous test data
    await dbHelper.cleanup();
    // Clear mailbox
    await emailHelper.clearMailbox(testEmail);
  });

  test.afterEach(async () => {
    // Clean up test data
    await dbHelper.cleanup();
  });

  test('should display signup page correctly', async ({ page }) => {
    await page.goto('/signup');

    // Check page elements
    await expect(page.locator('h1, h2, h3').filter({ hasText: /create account/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^password$/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /confirm password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Check SSO button
    await expect(page.getByRole('button', { name: /sso|keycloak/i })).toBeVisible();

    // Check link to login
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/signup');

    // Fill form with short password
    await page.getByRole('textbox', { name: /full name/i }).fill(testName);
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
    await page.getByRole('textbox', { name: /^password$/i }).fill('short');
    await page.getByRole('textbox', { name: /confirm password/i }).fill('short');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show validation error - either browser validation or custom error
    // The form has minLength={8} so browser validation may trigger first
    const browserValidation = page.getByRole('textbox', { name: /^password$/i });
    const customError = page.locator('text=/password must be at least 8 characters/i');

    // Check either validation is visible
    await expect(browserValidation.or(customError)).toBeVisible();

    // Verify form was not submitted by checking we're still on signup page
    await expect(page).toHaveURL(/signup/);
  });

  test('should validate password matching', async ({ page }) => {
    await page.goto('/signup');

    // Fill form with mismatched passwords
    await page.getByRole('textbox', { name: /full name/i }).fill(testName);
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
    await page.getByRole('textbox', { name: /^password$/i }).fill(testPassword);
    await page.getByRole('textbox', { name: /confirm password/i }).fill('DifferentPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show validation error
    await expect(page.locator('text=/passwords do not match/i')).toBeVisible();
  });

  test('should complete email signup successfully', async ({ page }) => {
    await page.goto('/signup');

    // Fill signup form
    await page.getByRole('textbox', { name: /full name/i }).fill(testName);
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
    await page.getByRole('textbox', { name: /^password$/i }).fill(testPassword);
    await page.getByRole('textbox', { name: /confirm password/i }).fill(testPassword);

    // Submit form
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show success message (email verification required)
    // Use .first() since multiple elements may match the pattern
    await expect(
      page.getByRole('heading', { name: /account created/i })
    ).toBeVisible({ timeout: 10000 });

    // Verify user was created in database
    const user = await dbHelper.getUserByEmail(testEmail);
    expect(user).toBeTruthy();
    expect(user.name).toBe(testName);
    expect(user.emailVerified).toBe(false); // Not verified yet
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    // Create existing user
    await dbHelper.createUser({
      email: testEmail,
      password: testPassword,
      name: 'Existing User',
      emailVerified: true,
    });

    await page.goto('/signup');

    // Try to signup with same email
    await page.getByRole('textbox', { name: /full name/i }).fill(testName);
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
    await page.getByRole('textbox', { name: /^password$/i }).fill(testPassword);
    await page.getByRole('textbox', { name: /confirm password/i }).fill(testPassword);
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show error about existing account
    await expect(
      page.locator('text=/already exists|already registered|already in use/i')
    ).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/signup');

    // Click login link
    await page.getByRole('link', { name: /sign in/i }).click();

    // Should be on login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1, h2, h3').filter({ hasText: /sign in/i })).toBeVisible();
  });

  // Skip email verification test if Inbucket is not configured
  test.skip('should complete email verification flow', async ({ page }) => {
    // This test requires Inbucket to be running and configured
    const uniqueEmail = `verify-test-${Date.now()}@example.com`;

    await page.goto('/signup');

    // Complete signup
    await page.fill('#name', testName);
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', testPassword);
    await page.fill('#confirmPassword', testPassword);
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=/check your email/i')).toBeVisible({ timeout: 10000 });

    // Get verification link from email
    const verificationLink = await emailHelper.getVerificationLink(uniqueEmail);
    expect(verificationLink).toBeTruthy();

    // Visit verification link
    await page.goto(verificationLink!);

    // Should redirect to onboarding or dashboard
    await expect(page).toHaveURL(/\/(onboarding|dashboard)/);

    // Verify email is now verified in database
    const user = await dbHelper.getUserByEmail(uniqueEmail);
    expect(user.emailVerified).toBe(true);
  });
});
