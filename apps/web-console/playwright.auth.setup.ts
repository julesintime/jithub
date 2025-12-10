import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * Authentication Setup for Playwright E2E Tests
 *
 * This file performs REAL authentication with Keycloak and stores the auth state
 * for reuse across all tests. NO MOCKING - uses actual Keycloak OIDC flow.
 *
 * Two auth states:
 * 1. admin.json - User with organization (for testing org features)
 * 2. newuser.json - User without organization (for testing onboarding)
 */

const adminAuthFile = path.join(__dirname, '.auth/admin.json');
const newUserAuthFile = path.join(__dirname, '.auth/newuser.json');

/**
 * Test user credentials for Keycloak
 * These should be real users in your Keycloak instance
 */
const ADMIN_USER = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@test.local',
  password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
  name: 'Test Admin',
};

const NEW_USER = {
  email: process.env.E2E_NEW_USER_EMAIL || 'newuser@test.local',
  password: process.env.E2E_NEW_USER_PASSWORD || 'newuser123',
  name: 'New User',
};

/**
 * Authenticate with Keycloak using REAL OIDC flow
 */
async function authenticateWithKeycloak(
  page: any,
  email: string,
  password: string
) {
  // Start at home page
  await page.goto('/');

  // Click "Sign in with Keycloak" button
  const signInButton = page.getByRole('button', {
    name: /sign in with keycloak/i,
  });
  await signInButton.click();

  // Wait for Keycloak login page
  await page.waitForURL(/keycloak\.xuperson\.org/);

  // Fill in Keycloak login form
  await page.getByLabel(/username or email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect back to app
  await page.waitForURL(/xuperson\.org/);

  // Verify authentication succeeded
  await expect(page).not.toHaveURL('/');
}

setup('authenticate as admin user', async ({ page }) => {
  await authenticateWithKeycloak(page, ADMIN_USER.email, ADMIN_USER.password);

  // Save auth state
  await page.context().storageState({ path: adminAuthFile });
});

setup('authenticate as new user', async ({ page }) => {
  await authenticateWithKeycloak(page, NEW_USER.email, NEW_USER.password);

  // Save auth state
  await page.context().storageState({ path: newUserAuthFile });
});
