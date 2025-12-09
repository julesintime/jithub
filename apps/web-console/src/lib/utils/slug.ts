/**
 * Organization slug generation and validation utilities
 *
 * Slugs are URL-safe identifiers for organizations, generated from organization names.
 * They must be unique across the entire realm and follow strict formatting rules.
 */

/**
 * Reserved slugs that cannot be used for organization names
 * These represent system routes and special identifiers
 */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'dashboard',
  'settings',
  'billing',
  'support',
  'onboarding',
  'account',
  'profile',
  'organization',
  'organizations',
  'team',
  'teams',
  'user',
  'users',
  'login',
  'logout',
  'signup',
  'signin',
  'register',
  'callback',
  'oauth',
  'saml',
  'oidc',
  'sso',
  'health',
  'status',
  'metrics',
  'docs',
  'documentation',
  'help',
  'about',
  'contact',
  'privacy',
  'terms',
  'tos',
];

/**
 * Configuration for slug generation and validation
 */
export const SLUG_CONFIG = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 50,
  PATTERN: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

/**
 * Generate a URL-safe slug from an organization name
 *
 * Rules:
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with hyphens
 * - Removes consecutive hyphens
 * - Removes leading/trailing hyphens
 * - Truncates to max length
 *
 * @param name - Organization name (e.g., "Acme Inc.")
 * @returns URL-safe slug (e.g., "acme-inc")
 *
 * @example
 * ```ts
 * generateSlug("Acme Inc.") // "acme-inc"
 * generateSlug("My Company!") // "my-company"
 * generateSlug("Company   Name") // "company-name"
 * ```
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()                      // "Acme Inc" → "acme inc"
    .trim()                             // Remove leading/trailing whitespace
    .replace(/[^a-z0-9]+/g, '-')       // "acme inc" → "acme-inc"
    .replace(/-+/g, '-')                // Remove consecutive hyphens
    .replace(/^-|-$/g, '')              // Remove leading/trailing hyphens
    .substring(0, SLUG_CONFIG.MAX_LENGTH); // Truncate to max length
}

/**
 * Validation result for slug checks
 */
export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a slug against all requirements
 *
 * Checks:
 * - Length (3-50 characters)
 * - Format (lowercase alphanumeric + hyphens, no leading/trailing hyphens)
 * - Not reserved
 *
 * @param slug - Slug to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```ts
 * validateSlug("acme-inc") // { valid: true }
 * validateSlug("ab") // { valid: false, error: "Slug must be at least 3 characters" }
 * validateSlug("admin") // { valid: false, error: "Slug 'admin' is reserved" }
 * ```
 */
export function validateSlug(slug: string): SlugValidationResult {
  // Check minimum length
  if (slug.length < SLUG_CONFIG.MIN_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at least ${SLUG_CONFIG.MIN_LENGTH} characters`,
    };
  }

  // Check maximum length
  if (slug.length > SLUG_CONFIG.MAX_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at most ${SLUG_CONFIG.MAX_LENGTH} characters`,
    };
  }

  // Check format (lowercase alphanumeric + hyphens, no leading/trailing hyphens)
  if (!SLUG_CONFIG.PATTERN.test(slug)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens (no leading/trailing hyphens)',
    };
  }

  // Check if reserved
  if (RESERVED_SLUGS.includes(slug)) {
    return {
      valid: false,
      error: `Slug '${slug}' is reserved and cannot be used`,
    };
  }

  return { valid: true };
}

/**
 * Generate slug suggestions when the preferred slug is taken
 *
 * @param baseSlug - Original slug that was taken
 * @param count - Number of suggestions to generate (default: 3)
 * @returns Array of alternative slug suggestions
 *
 * @example
 * ```ts
 * generateSlugSuggestions("acme-inc")
 * // ["acme-inc-2", "acme-inc-3", "acme-inc-4"]
 * ```
 */
export function generateSlugSuggestions(
  baseSlug: string,
  count: number = 3
): string[] {
  const suggestions: string[] = [];

  for (let i = 2; i <= count + 1; i++) {
    const suggestion = `${baseSlug}-${i}`;

    // Ensure suggestion doesn't exceed max length
    if (suggestion.length <= SLUG_CONFIG.MAX_LENGTH) {
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

/**
 * Check if a slug is reserved
 *
 * @param slug - Slug to check
 * @returns True if the slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}
