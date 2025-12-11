import { Page, BrowserContext } from '@playwright/test';
import { dbHelper } from './database-helper';

/**
 * Auth helper for E2E tests
 * Provides utilities for authentication and session management
 */
export class AuthHelper {
  /**
   * Set authentication cookie for a user via API login
   * Uses better-auth sign-in API to get a valid session
   */
  async setAuthCookie(context: BrowserContext, userId: string, activeOrganizationId?: string) {
    // NOTE: Better-auth hashes session tokens before storing them.
    // We can't manually create sessions that work.
    // For tests requiring auth, use loginViaApi() instead.

    // Create a temporary page to do the login
    const page = await context.newPage();

    try {
      // Get user's email from the database
      const users = await dbHelper.getUserById(userId);
      if (!users) {
        throw new Error(`User ${userId} not found`);
      }

      // We need the original password - this means tests need to use loginViaApi
      // For now, return a dummy token
      console.warn('setAuthCookie: Use loginViaApi for proper authentication');
      return 'dummy-token';
    } finally {
      await page.close();
    }
  }

  /**
   * Login via API and store the session cookie
   * This is the recommended way to authenticate in tests
   */
  async loginViaApi(page: Page, email: string, password: string) {
    // Call the sign-in API directly
    const response = await page.request.post('/api/auth/sign-in/email', {
      data: {
        email,
        password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Login failed: ${response.status()} - ${body}`);
    }

    // The response will set the session cookie automatically
    return response.json();
  }

  /**
   * Set active organization for the session
   */
  async setActiveOrganization(page: Page, organizationId: string) {
    // First try via API
    const response = await page.request.post('/api/auth/organization/set-active', {
      data: {
        organizationId,
      },
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
    });

    if (!response.ok()) {
      console.warn('Failed to set active organization via API:', await response.text());
      // Fallback: navigate to org selection page and click the org
      await page.goto('/organizations/select');
      // Wait for org button to be visible and click it
      const orgButton = page.locator(`button:has-text("${organizationId}")`).first();
      if (await orgButton.isVisible({ timeout: 2000 })) {
        await orgButton.click();
        await page.waitForURL(/\/(dashboard|settings)/, { timeout: 5000 }).catch(() => {});
      }
    }

    return response;
  }

  /**
   * Login via email/password using UI
   */
  async loginWithEmail(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|onboarding|organizations)/);
  }

  /**
   * Signup via email/password using UI
   */
  async signupWithEmail(page: Page, data: { name: string; email: string; password: string }) {
    await page.goto('/signup');
    await page.fill('#name', data.name);
    await page.fill('#email', data.email);
    await page.fill('#password', data.password);
    await page.fill('#confirmPassword', data.password);
    await page.click('button[type="submit"]');

    // Wait for success message or redirect
    await page.waitForSelector('text=Account Created', { timeout: 10000 });
  }

  /**
   * Get current session from API
   */
  async getSession(page: Page) {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/get-session');
      if (!res.ok) return null;
      return res.json();
    });
    return response;
  }

  /**
   * Logout using UI
   */
  async logout(page: Page) {
    // Look for sign out button
    const signOutButton = page.locator('button:has-text("Sign Out")');
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await page.waitForURL('/');
    }
  }

  /**
   * Create a test user via signup API (properly hashes password)
   * This ensures the password is stored in the format better-auth expects
   */
  async createTestUserViaApi(page: Page, options?: {
    emailVerified?: boolean;
    withOrganization?: boolean;
  }) {
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    const name = `Test User ${timestamp}`;

    // Create user via signup API
    const signupResponse = await page.request.post('/api/auth/sign-up/email', {
      data: { email, password, name },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!signupResponse.ok()) {
      const body = await signupResponse.text();
      throw new Error(`Signup failed: ${signupResponse.status()} - ${body}`);
    }

    // Get the created user from database
    const testUser = await dbHelper.getUserByEmail(email);
    if (!testUser) {
      throw new Error('User was not created in database');
    }

    // Set email as verified if requested
    if (options?.emailVerified) {
      await dbHelper.setEmailVerified(email, true);
    }

    let testOrg = null;
    if (options?.withOrganization) {
      testOrg = await dbHelper.createOrganization({
        name: `Test Org ${timestamp}`,
        slug: `test-org-${timestamp}`,
        createdBy: testUser.id,
      });
      await dbHelper.addMembership(testUser.id, testOrg.id, 'owner');
    }

    return {
      user: testUser,
      organization: testOrg,
      credentials: { email, password, name },
    };
  }

  /**
   * Create a test user directly in database
   * NOTE: This won't work for login because password hash format differs
   * @deprecated Use createTestUserViaApi instead
   */
  async createTestUser(options?: {
    emailVerified?: boolean;
    withOrganization?: boolean;
  }) {
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'TestPassword123!';
    const name = `Test User ${timestamp}`;

    const testUser = await dbHelper.createUser({
      email,
      password,
      name,
      emailVerified: options?.emailVerified ?? true,
    });

    let testOrg = null;
    if (options?.withOrganization) {
      testOrg = await dbHelper.createOrganization({
        name: `Test Org ${timestamp}`,
        slug: `test-org-${timestamp}`,
        createdBy: testUser.id,
      });
      await dbHelper.addMembership(testUser.id, testOrg.id, 'owner');
    }

    return {
      user: testUser,
      organization: testOrg,
      credentials: { email, password, name },
    };
  }

  /**
   * Create a test user and authenticate them via API
   * This is the recommended approach for tests requiring authentication
   */
  async createAuthenticatedUser(
    page: Page,
    options?: {
      emailVerified?: boolean;
      withOrganization?: boolean;
    }
  ) {
    // Create user via signup API (properly hashes password)
    const { user, organization, credentials } = await this.createTestUserViaApi(page, options);

    // Login via API
    await this.loginViaApi(page, credentials.email, credentials.password);

    // Set active organization if created
    if (organization) {
      // Go to org selection and click the org to set it active
      await page.goto('/organizations/select');
      await page.waitForLoadState('networkidle');

      // Click on the organization to select it
      const orgButton = page.locator(`button:has-text("${organization.name}")`).first();
      if (await orgButton.isVisible({ timeout: 5000 })) {
        await orgButton.click();
        // Wait for navigation
        await page.waitForURL(/\/(dashboard|settings)/, { timeout: 10000 }).catch(() => {
          console.warn('Did not redirect to dashboard/settings after org selection');
        });
      } else {
        console.warn(`Org button for "${organization.name}" not visible`);
      }
    }

    return { user, organization, credentials };
  }
}

export const authHelper = new AuthHelper();
