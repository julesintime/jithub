import { Page } from '@playwright/test';

/**
 * Keycloak helper for E2E tests
 * Provides utilities for Keycloak OIDC authentication
 */
export class KeycloakHelper {
  private keycloakUrl: string;
  private realm: string;
  private adminUser: string;
  private adminPassword: string;

  constructor() {
    this.keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'test';
    this.adminUser = process.env.KEYCLOAK_ADMIN_USER || 'admin';
    this.adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
  }

  /**
   * Get admin access token for Keycloak API calls
   */
  private async getAdminToken(): Promise<string> {
    const response = await fetch(
      `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: this.adminUser,
          password: this.adminPassword,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get admin token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Create a test user in Keycloak
   */
  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    emailVerified?: boolean;
  }): Promise<string> {
    const token = await this.getAdminToken();

    // Create user
    const response = await fetch(
      `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName || 'Test',
          lastName: userData.lastName || 'User',
          emailVerified: userData.emailVerified ?? true,
          enabled: true,
          credentials: [
            {
              type: 'password',
              value: userData.password,
              temporary: false,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Keycloak user: ${errorText}`);
    }

    // Get the created user's ID from Location header
    const locationHeader = response.headers.get('Location');
    if (locationHeader) {
      return locationHeader.split('/').pop() || '';
    }

    // If no Location header, search for the user
    return this.getUserIdByEmail(userData.email);
  }

  /**
   * Get user ID by email
   */
  async getUserIdByEmail(email: string): Promise<string> {
    const token = await this.getAdminToken();

    const response = await fetch(
      `${this.keycloakUrl}/admin/realms/${this.realm}/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to find user: ${response.statusText}`);
    }

    const users = await response.json();
    if (users.length === 0) {
      throw new Error(`User not found: ${email}`);
    }

    return users[0].id;
  }

  /**
   * Delete a user from Keycloak
   */
  async deleteUser(userId: string): Promise<void> {
    const token = await this.getAdminToken();

    const response = await fetch(
      `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }
  }

  /**
   * Delete a user by email
   */
  async deleteUserByEmail(email: string): Promise<void> {
    try {
      const userId = await this.getUserIdByEmail(email);
      await this.deleteUser(userId);
    } catch (error) {
      // Ignore if user doesn't exist
      console.log(`User ${email} not found in Keycloak, skipping deletion`);
    }
  }

  /**
   * Login via Keycloak UI
   * Assumes page has been redirected to Keycloak login
   */
  async login(page: Page, username: string, password: string): Promise<void> {
    // Wait for Keycloak login page
    await page.waitForURL(/.*\/auth\/realms\/.*\/protocol\/openid-connect/, { timeout: 10000 });

    // Fill login form
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('#kc-login');

    // Handle consent screen if present
    try {
      const consentButton = page.locator('input[name="accept"]');
      if (await consentButton.isVisible({ timeout: 2000 })) {
        await consentButton.click();
      }
    } catch {
      // No consent screen, continue
    }
  }

  /**
   * Click SSO button and complete Keycloak login
   */
  async loginWithSSO(
    page: Page,
    credentials: { username: string; password: string }
  ): Promise<void> {
    // Find and click the SSO button
    const ssoButton = page.locator('button:has-text("SSO"), button:has-text("Keycloak")');
    await ssoButton.click();

    // Complete Keycloak login
    await this.login(page, credentials.username, credentials.password);

    // Wait for redirect back to app
    await page.waitForURL(/localhost:300[0-9]/, { timeout: 15000 });
  }

  /**
   * Create a test user in Keycloak and return credentials
   */
  async createTestUser(): Promise<{
    keycloakUserId: string;
    credentials: {
      username: string;
      email: string;
      password: string;
    };
  }> {
    const timestamp = Date.now();
    const username = `keycloak-test-${timestamp}`;
    const email = `keycloak-test-${timestamp}@example.com`;
    const password = 'TestPassword123!';

    const keycloakUserId = await this.createUser({
      username,
      email,
      password,
      emailVerified: true,
    });

    return {
      keycloakUserId,
      credentials: { username, email, password },
    };
  }

  /**
   * Clean up Keycloak test users
   */
  async cleanupTestUsers(): Promise<void> {
    const token = await this.getAdminToken();

    // Find all test users
    const response = await fetch(
      `${this.keycloakUrl}/admin/realms/${this.realm}/users?search=keycloak-test-`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to list test users:', response.statusText);
      return;
    }

    const users = await response.json();
    for (const user of users) {
      await this.deleteUser(user.id);
    }
  }
}

export const keycloakHelper = new KeycloakHelper();
