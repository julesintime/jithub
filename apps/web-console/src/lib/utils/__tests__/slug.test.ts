import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  validateSlug,
  generateSlugSuggestions,
  isReservedSlug,
  RESERVED_SLUGS,
  SLUG_CONFIG,
} from '../slug';

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('ACME INC')).toBe('acme-inc');
    expect(generateSlug('MyCompany')).toBe('mycompany');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('Acme Inc')).toBe('acme-inc');
    expect(generateSlug('My   Company')).toBe('my-company');
  });

  it('should replace special characters with hyphens', () => {
    expect(generateSlug('Acme Inc.')).toBe('acme-inc');
    expect(generateSlug('Company!@#')).toBe('company');
    expect(generateSlug('Test & Company')).toBe('test-company');
  });

  it('should remove consecutive hyphens', () => {
    expect(generateSlug('Test---Company')).toBe('test-company');
    expect(generateSlug('A  -  B')).toBe('a-b');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('-test-')).toBe('test');
    expect(generateSlug('---company---')).toBe('company');
  });

  it('should handle numbers correctly', () => {
    expect(generateSlug('Company123')).toBe('company123');
    expect(generateSlug('Test 2023')).toBe('test-2023');
  });

  it('should truncate to max length', () => {
    const longName = 'A'.repeat(100);
    const slug = generateSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(SLUG_CONFIG.MAX_LENGTH);
  });

  it('should handle empty strings', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug('   ')).toBe('');
  });

  it('should handle unicode characters', () => {
    expect(generateSlug('Café Company')).toBe('caf-company');
    expect(generateSlug('日本Company')).toBe('company');
  });
});

describe('validateSlug', () => {
  it('should accept valid slugs', () => {
    expect(validateSlug('acme-inc').valid).toBe(true);
    expect(validateSlug('my-company').valid).toBe(true);
    expect(validateSlug('test123').valid).toBe(true);
    expect(validateSlug('company-2023').valid).toBe(true);
  });

  it('should reject slugs that are too short', () => {
    const result = validateSlug('ab');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least');
  });

  it('should reject slugs that are too long', () => {
    const longSlug = 'a'.repeat(SLUG_CONFIG.MAX_LENGTH + 1);
    const result = validateSlug(longSlug);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at most');
  });

  it('should reject slugs with uppercase letters', () => {
    const result = validateSlug('Acme-Inc');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase');
  });

  it('should reject slugs with special characters', () => {
    expect(validateSlug('acme_inc').valid).toBe(false);
    expect(validateSlug('acme.inc').valid).toBe(false);
    expect(validateSlug('acme@inc').valid).toBe(false);
  });

  it('should reject slugs with leading hyphens', () => {
    const result = validateSlug('-acme-inc');
    expect(result.valid).toBe(false);
  });

  it('should reject slugs with trailing hyphens', () => {
    const result = validateSlug('acme-inc-');
    expect(result.valid).toBe(false);
  });

  it('should reject reserved slugs', () => {
    RESERVED_SLUGS.forEach((reserved) => {
      const result = validateSlug(reserved);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });
  });

  it('should reject slugs with consecutive hyphens', () => {
    const result = validateSlug('acme--inc');
    expect(result.valid).toBe(false);
  });
});

describe('generateSlugSuggestions', () => {
  it('should generate default number of suggestions', () => {
    const suggestions = generateSlugSuggestions('acme-inc');
    expect(suggestions).toHaveLength(3);
    expect(suggestions).toEqual(['acme-inc-2', 'acme-inc-3', 'acme-inc-4']);
  });

  it('should generate custom number of suggestions', () => {
    const suggestions = generateSlugSuggestions('acme-inc', 5);
    expect(suggestions).toHaveLength(5);
  });

  it('should not exceed max length', () => {
    const longSlug = 'a'.repeat(SLUG_CONFIG.MAX_LENGTH - 2);
    const suggestions = generateSlugSuggestions(longSlug);
    suggestions.forEach((suggestion) => {
      expect(suggestion.length).toBeLessThanOrEqual(SLUG_CONFIG.MAX_LENGTH);
    });
  });

  it('should handle slugs close to max length', () => {
    const longSlug = 'a'.repeat(SLUG_CONFIG.MAX_LENGTH);
    const suggestions = generateSlugSuggestions(longSlug, 5);
    // Should not generate any suggestions that exceed max length
    expect(suggestions.length).toBe(0);
  });
});

describe('isReservedSlug', () => {
  it('should return true for reserved slugs', () => {
    expect(isReservedSlug('admin')).toBe(true);
    expect(isReservedSlug('api')).toBe(true);
    expect(isReservedSlug('dashboard')).toBe(true);
  });

  it('should return false for non-reserved slugs', () => {
    expect(isReservedSlug('acme-inc')).toBe(false);
    expect(isReservedSlug('my-company')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isReservedSlug('ADMIN')).toBe(true);
    expect(isReservedSlug('Admin')).toBe(true);
  });
});

describe('integration tests', () => {
  it('should generate valid slugs from company names', () => {
    const testCases = [
      { name: 'Acme Inc.', expectedSlug: 'acme-inc' },
      { name: 'My Company LLC', expectedSlug: 'my-company-llc' },
      { name: 'Test & Associates', expectedSlug: 'test-associates' },
      { name: '123 Corp', expectedSlug: '123-corp' },
    ];

    testCases.forEach(({ name, expectedSlug }) => {
      const slug = generateSlug(name);
      expect(slug).toBe(expectedSlug);
      expect(validateSlug(slug).valid).toBe(true);
    });
  });

  it('should handle edge cases gracefully', () => {
    // Special characters only
    expect(generateSlug('!!!')).toBe('');

    // Mixed unicode and ASCII
    const slug = generateSlug('Café 123 Company');
    expect(validateSlug(slug).valid).toBe(true);

    // Very long names
    const longName = 'The Very Long Company Name That Exceeds Maximum Length Allowed';
    const slug2 = generateSlug(longName);
    expect(slug2.length).toBeLessThanOrEqual(SLUG_CONFIG.MAX_LENGTH);
  });
});
