import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeycloakOrganizationClient } from '../client';

// Mock fetch globally
global.fetch = vi.fn();

describe('KeycloakOrganizationClient', () => {
  let client: KeycloakOrganizationClient;

  beforeEach(() => {
    client = new KeycloakOrganizationClient();
    vi.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create a new organization successfully', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        refresh_expires_in: 1800,
        token_type: 'Bearer',
      };

      const mockOrgId = 'org-123';

      // Mock token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      // Mock create organization request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (name: string) =>
            name === 'Location'
              ? `https://keycloak.test.com/admin/realms/test-realm/organizations/${mockOrgId}`
              : null,
        },
      });

      const result = await client.createOrganization({
        name: 'Test Org',
        alias: 'test-org',
        domains: [{ name: 'test.com' }],
      });

      expect(result.id).toBe(mockOrgId);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle creation errors', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        refresh_expires_in: 1800,
        token_type: 'Bearer',
      };

      // Mock token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      // Mock failed create request
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: async () => 'Organization already exists',
      });

      await expect(
        client.createOrganization({
          name: 'Test Org',
        })
      ).rejects.toThrow('Failed to create organization');
    });
  });

  describe('addUserToOrganization', () => {
    it('should add user to organization successfully', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        refresh_expires_in: 1800,
        token_type: 'Bearer',
      };

      // Mock token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      // Mock add user request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await expect(
        client.addUserToOrganization('org-123', 'user-456')
      ).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Verify user ID is sent as JSON string
      const addUserCall = (global.fetch as any).mock.calls[1];
      expect(addUserCall[1].body).toBe(JSON.stringify('user-456'));
    });
  });

  describe('getOrganizationsForUser', () => {
    it('should filter organizations by email domain', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        refresh_expires_in: 1800,
        token_type: 'Bearer',
      };

      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org 1',
          domains: [{ name: 'test.com', verified: true }],
        },
        {
          id: 'org-2',
          name: 'Test Org 2',
          domains: [{ name: 'example.com', verified: true }],
        },
      ];

      // Mock token request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      // Mock list organizations request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrgs,
      });

      const result = await client.getOrganizationsForUser('user@test.com');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-1');
      expect(result[0].domains?.[0].name).toBe('test.com');
    });
  });
});
