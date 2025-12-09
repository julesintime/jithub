import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST } from '../route';
import { db } from '@/lib/db';
import { organization, member, user as userTable } from '@/lib/db/schema';
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
    createOrganization: vi.fn().mockResolvedValue({ id: 'kc-org-123' }),
    searchOrganizationsByAlias: vi.fn().mockResolvedValue([]),
    getUserByEmail: vi.fn().mockResolvedValue({ id: 'kc-user-123' }),
    addUserToOrganization: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('POST /api/organization/create', () => {
  const TEST_USER_ID = generateId();
  const TEST_USER_EMAIL = 'test@example.com';
  const CONFLICT_ORG_ID = generateId();
  const CONFLICT_SLUG = 'existing-company';

  beforeAll(async () => {
    // Create a test user
    await db.insert(userTable).values({
      id: TEST_USER_ID,
      name: 'Test User',
      email: TEST_USER_EMAIL,
      emailVerified: true,
    });

    // Create an existing organization for conflict testing
    await db.insert(organization).values({
      id: CONFLICT_ORG_ID,
      name: 'Existing Company',
      slug: CONFLICT_SLUG,
      keycloakOrgId: 'kc-existing-123',
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(member).where(eq(member.userId, TEST_USER_ID));
    await db.delete(organization).where(eq(organization.createdBy, TEST_USER_ID));
    await db.delete(organization).where(eq(organization.id, CONFLICT_ORG_ID));
    await db.delete(userTable).where(eq(userTable.id, TEST_USER_ID));
  });

  it('should return 401 if user is not authenticated', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Org', slug: 'test-org' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 400 if name is missing', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test User' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'test-org' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should return 400 if slug is missing', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test User' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Org' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('required');
  });

  it('should return 400 for invalid slug format', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test User' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Org', slug: 'invalid_slug!' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 409 if slug already exists in PostgreSQL', async () => {
    const { auth } = await import('@/lib/auth/config');
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test User' },
      session: { id: 'session-123' },
    } as any);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Conflict Test', slug: CONFLICT_SLUG }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already taken');
  });

  it('should return 409 if slug exists in Keycloak', async () => {
    const { auth } = await import('@/lib/auth/config');
    const { KeycloakOrganizationClient } = await import('@/lib/keycloak/client');

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test User' },
      session: { id: 'session-123' },
    } as any);

    // Mock Keycloak to return existing org
    vi.mocked(KeycloakOrganizationClient).mockImplementationOnce(() => ({
      createOrganization: vi.fn(),
      searchOrganizationsByAlias: vi.fn().mockResolvedValue([{ id: 'kc-existing' }]),
      getUserByEmail: vi.fn(),
      addUserToOrganization: vi.fn(),
    }) as any);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Org', slug: 'keycloak-conflict' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already registered in Keycloak');
  });

  it('should successfully create organization in Keycloak and PostgreSQL', async () => {
    const { auth } = await import('@/lib/auth/config');
    const { KeycloakOrganizationClient } = await import('@/lib/keycloak/client');

    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: TEST_USER_ID, email: TEST_USER_EMAIL, name: 'Test User' },
      session: { id: 'session-123' },
    } as any);

    // Mock Keycloak client for successful creation
    const mockCreateOrg = vi.fn().mockResolvedValue({ id: 'kc-new-org-123' });
    const mockSearchByAlias = vi.fn().mockResolvedValue([]);
    const mockGetUserByEmail = vi.fn().mockResolvedValue({ id: 'kc-user-123' });
    const mockAddUserToOrg = vi.fn().mockResolvedValue(undefined);

    vi.mocked(KeycloakOrganizationClient).mockImplementationOnce(() => ({
      createOrganization: mockCreateOrg,
      searchOrganizationsByAlias: mockSearchByAlias,
      getUserByEmail: mockGetUserByEmail,
      addUserToOrganization: mockAddUserToOrg,
    }) as any);

    const request = new Request('http://localhost:3000/api/organization/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Company', slug: 'new-company' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.organization).toBeDefined();
    expect(data.organization.name).toBe('New Company');
    expect(data.organization.slug).toBe('new-company');
    expect(data.organization.keycloakOrgId).toBe('kc-new-org-123');
    expect(data.organization.role).toBe('owner');

    // Verify Keycloak client was called correctly
    expect(mockCreateOrg).toHaveBeenCalledWith({
      name: 'New Company',
      alias: 'new-company',
      attributes: expect.objectContaining({
        slug: ['new-company'],
        created_by: [TEST_USER_ID],
        subscription_plan: ['free'],
      }),
    });
    expect(mockAddUserToOrg).toHaveBeenCalledWith('kc-new-org-123', 'kc-user-123');

    // Verify organization was created in PostgreSQL
    const createdOrgs = await db
      .select()
      .from(organization)
      .where(eq(organization.slug, 'new-company'));

    expect(createdOrgs.length).toBe(1);
    expect(createdOrgs[0].name).toBe('New Company');
    expect(createdOrgs[0].keycloakOrgId).toBe('kc-new-org-123');

    // Verify membership was created
    const membership = await db
      .select()
      .from(member)
      .where(eq(member.organizationId, createdOrgs[0].id));

    expect(membership.length).toBe(1);
    expect(membership[0].userId).toBe(TEST_USER_ID);
    expect(membership[0].role).toBe('owner');
  });
});
