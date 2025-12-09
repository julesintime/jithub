import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST } from '../route';
import { db } from '@/lib/db';
import { organization, member, user as userTable, invitation } from '@/lib/db/schema';
import { generateId } from 'better-auth';
import { eq } from 'drizzle-orm';

// Mock the auth module
vi.mock('@/lib/auth/config', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the Keycloak client
vi.mock('@/lib/keycloak/client', () => ({
  KeycloakOrganizationClient: vi.fn().mockImplementation(() => ({
    inviteUserToOrganization: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('POST /api/organization/invite', () => {
  const TEST_USER_ID = generateId();
  const TEST_USER_EMAIL = 'owner@example.com';
  const TEST_ORG_ID = generateId();
  const TEST_ORG_SLUG = 'test-org';
  const KEYCLOAK_ORG_ID = 'kc-org-123';

  beforeAll(async () => {
    // Create test user
    await db.insert(userTable).values({
      id: TEST_USER_ID,
      name: 'Test Owner',
      email: TEST_USER_EMAIL,
      emailVerified: true,
    });

    // Create test organization
    await db.insert(organization).values({
      id: TEST_ORG_ID,
      name: 'Test Organization',
      slug: TEST_ORG_SLUG,
      keycloakOrgId: KEYCLOAK_ORG_ID,
      createdBy: TEST_USER_ID,
    });

    // Add user as owner
    await db.insert(member).values({
      id: generateId(),
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      role: 'owner',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(invitation).where(eq(invitation.organizationId, TEST_ORG_ID));
    await db.delete(member).where(eq(member.organizationId, TEST_ORG_ID));
    await db.delete(organization).where(eq(organization.id, TEST_ORG_ID));
    await db.delete(userTable).where(eq(userTable.id, TEST_USER_ID));
  });

  it('should return 401 if user is not authenticated', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        email: 'newuser@example.com',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 400 if organizationId is missing', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newuser@example.com',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should return 400 if email is missing', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should return 400 for invalid email format', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        email: 'invalid-email',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid email');
  });

  it('should return 400 for invalid role', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        email: 'newuser@example.com',
        role: 'invalid-role',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid role');
  });

  it('should return 404 if organization does not exist', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'nonexistent-org',
        email: 'newuser@example.com',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('should successfully send invitation for valid request', async () => {
    const { auth } = await import('@/lib/auth/config');
    const { KeycloakOrganizationClient } = await import('@/lib/keycloak/client');

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    const mockInvite = vi.fn().mockResolvedValue(undefined);
    vi.mocked(KeycloakOrganizationClient).mockImplementationOnce(() => ({
      inviteUserToOrganization: mockInvite,
    }) as any);

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        email: 'bob@external.com',
        role: 'member',
        firstName: 'Bob',
        lastName: 'Smith',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.invitation).toBeDefined();
    expect(data.invitation.email).toBe('bob@external.com');
    expect(data.invitation.role).toBe('member');
    expect(data.invitation.status).toBe('pending');

    // Verify Keycloak client was called
    expect(mockInvite).toHaveBeenCalledWith(
      KEYCLOAK_ORG_ID,
      'bob@external.com',
      'Bob',
      'Smith'
    );

    // Verify invitation was tracked in database
    const invitations = await db
      .select()
      .from(invitation)
      .where(eq(invitation.email, 'bob@external.com'));

    expect(invitations.length).toBe(1);
    expect(invitations[0].organizationId).toBe(TEST_ORG_ID);
    expect(invitations[0].status).toBe('pending');
  });

  it('should return 409 if invitation already exists', async () => {
    const { auth } = await import('@/lib/auth/config');

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test Owner' },
      session: { id: 'session-123' },
    } as any);

    // Create existing invitation
    await db.insert(invitation).values({
      id: generateId(),
      organizationId: TEST_ORG_ID,
      email: 'existing@example.com',
      role: 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      inviterId: TEST_USER_ID,
    });

    const request = new Request('http://localhost:3000/api/organization/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        email: 'existing@example.com',
        role: 'member',
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already sent');
  });
});
