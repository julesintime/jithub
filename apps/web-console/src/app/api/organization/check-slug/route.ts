import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organization, reservedSlugs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  validateSlug,
  generateSlugSuggestions,
  isReservedSlug,
} from '@/lib/utils/slug';

/**
 * GET /api/organization/check-slug
 *
 * Check if an organization slug is available for use
 *
 * Query Parameters:
 * - slug: The slug to check (required)
 *
 * Returns:
 * - available: true if slug is available, false if taken/invalid
 * - error: Error message if slug is invalid or reserved
 * - suggestions: Array of alternative slugs if unavailable
 *
 * @example
 * GET /api/organization/check-slug?slug=acme-inc
 * → { available: true }
 *
 * GET /api/organization/check-slug?slug=admin
 * → { available: false, error: "Slug 'admin' is reserved", suggestions: ["admin-2", "admin-3"] }
 */
export async function GET(request: NextRequest) {
  try {
    // Extract slug from query parameters
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        {
          available: false,
          error: 'Slug parameter is required',
        },
        { status: 400 }
      );
    }

    // Validate slug format
    const validation = validateSlug(slug);

    if (!validation.valid) {
      return NextResponse.json(
        {
          available: false,
          error: validation.error,
          suggestions: generateSlugSuggestions(slug),
        },
        { status: 400 }
      );
    }

    // Check if slug is reserved (system slugs)
    if (isReservedSlug(slug)) {
      return NextResponse.json({
        available: false,
        error: `Slug '${slug}' is reserved and cannot be used`,
        suggestions: generateSlugSuggestions(slug),
      });
    }

    // Check if slug exists in database
    const existingOrg = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1);

    if (existingOrg.length > 0) {
      return NextResponse.json({
        available: false,
        error: `Slug '${slug}' is already taken`,
        suggestions: generateSlugSuggestions(slug),
      });
    }

    // Slug is available!
    return NextResponse.json({
      available: true,
      slug,
    });
  } catch (error) {
    console.error('Error checking slug availability:', error);

    return NextResponse.json(
      {
        available: false,
        error: 'Failed to check slug availability',
      },
      { status: 500 }
    );
  }
}
