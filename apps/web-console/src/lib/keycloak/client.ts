/**
 * Keycloak Admin API Client for Organizations
 *
 * References:
 * - https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/organization/admin/resource/OrganizationsResource.html
 * - https://github.com/keycloak/keycloak/discussions/34230
 */

interface KeycloakOrganization {
  id?: string;
  name: string;
  alias?: string;
  redirectUrl?: string;
  domains?: Array<{ name: string; verified?: boolean }>;
  attributes?: Record<string, string[]>;
}

interface KeycloakAdminTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

export class KeycloakOrganizationClient {
  private baseUrl: string;
  private realm: string;
  private clientId: string;
  private clientSecret: string;
  private adminToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env['KEYCLOAK_BASE_URL'] || '';
    this.realm = process.env['KEYCLOAK_REALM'] || '';
    this.clientId = process.env['KEYCLOAK_CLIENT_ID'] || '';
    this.clientSecret = process.env['KEYCLOAK_CLIENT_SECRET'] || '';
  }

  /**
   * Get admin access token for Keycloak API
   */
  private async getAdminToken(): Promise<string> {
    // Return cached token if still valid
    if (this.adminToken && Date.now() < this.tokenExpiry) {
      return this.adminToken;
    }

    const tokenUrl = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get admin token: ${response.statusText}`);
    }

    const data: KeycloakAdminTokenResponse = await response.json();
    this.adminToken = data.access_token;
    // Set expiry with 30 second buffer
    this.tokenExpiry = Date.now() + (data.expires_in - 30) * 1000;

    return this.adminToken;
  }

  /**
   * Create a new organization in Keycloak
   */
  async createOrganization(
    org: KeycloakOrganization
  ): Promise<{ id: string }> {
    const token = await this.getAdminToken();
    const url = `${this.baseUrl}/admin/realms/${this.realm}/organizations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(org),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to create organization: ${response.statusText} - ${error}`
      );
    }

    // Extract organization ID from Location header
    const location = response.headers.get('Location');
    const id = location?.split('/').pop() || '';

    return { id };
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string): Promise<KeycloakOrganization | null> {
    const token = await this.getAdminToken();
    const url = `${this.baseUrl}/admin/realms/${this.realm}/organizations/${orgId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get organization: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Add user to organization
   * Note: userId must be sent as JSON string in request body
   */
  async addUserToOrganization(
    orgId: string,
    userId: string
  ): Promise<void> {
    const token = await this.getAdminToken();
    const url = `${this.baseUrl}/admin/realms/${this.realm}/organizations/${orgId}/members`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userId),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Failed to add user to organization: ${response.statusText} - ${error}`
      );
    }
  }

  /**
   * Get organizations for a user (via email domain matching)
   */
  async getOrganizationsForUser(userEmail: string): Promise<KeycloakOrganization[]> {
    const token = await this.getAdminToken();
    const url = `${this.baseUrl}/admin/realms/${this.realm}/organizations`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list organizations: ${response.statusText}`);
    }

    const orgs: KeycloakOrganization[] = await response.json();

    // Filter organizations by email domain
    const domain = userEmail.split('@')[1];
    return orgs.filter((org) =>
      org.domains?.some((d) => d.name === domain)
    );
  }
}
