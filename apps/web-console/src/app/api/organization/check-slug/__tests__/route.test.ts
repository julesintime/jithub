import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '../route';
import { db } from '@/lib/db';
import { organization } from '@/lib/db/schema';
import { generateId } from 'better-auth';

describe('GET /api/organization/check-slug', () => {
  const TEST_ORG_ID = generateId();
  const TEST_SLUG = 'test-company-exists';

  beforeAll(async () => {
    // Create a test organization to check uniqueness
    await db.insert(organization).values({
      id: TEST_ORG_ID,
      name: 'Test Company Exists',
      slug: TEST_SLUG,
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(organization).where((table) => table.id.equals(TEST_ORG_ID));
  });

  it('should return 400 if slug parameter is missing', async () => {
    const request = new Request('http://localhost:3000/api/organization/check-slug');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.available).toBe(false);
    expect(data.error).toContain('required');
  });

  it('should return error for slugs that are too short', async () => {
    const request = new Request('http://localhost:3000/api/organization/check-slug?slug=ab');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.available).toBe(false);
    expect(data.error).toContain('at least');
  });

  it('should return error for slugs with invalid characters', async () => {
    const request = new Request('http://localhost:3000/api/organization/check-slug?slug=test_invalid');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.available).toBe(false);
    expect(data.error).toContain('lowercase');
  });

  it('should return unavailable for reserved slugs', async () => {
    const request = new Request('http://localhost:3000/api/organization/check-slug?slug=admin');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.error).toContain('reserved');
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.length).toBeGreaterThan(0);
  });

  it('should return unavailable for existing slugs', async () => {
    const request = new Request(`http://localhost:3000/api/organization/check-slug?slug=${TEST_SLUG}`);
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
    expect(data.error).toContain('already taken');
    expect(data.suggestions).toBeDefined();
  });

  it('should return available for valid, unused slugs', async () => {
    const request = new Request('http://localhost:3000/api/organization/check-slug?slug=new-company-2024');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);
    expect(data.slug).toBe('new-company-2024');
  });

  it('should provide suggestions when slug is taken', async () => {
    const request = new Request('http://localhost:3000/api/organization/check-slug?slug=admin');
    const response = await GET(request as any);
    const data = await response.json();

    expect(data.suggestions).toEqual(['admin-2', 'admin-3', 'admin-4']);
  });
});
