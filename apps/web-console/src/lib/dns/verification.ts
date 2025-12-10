/**
 * DNS Verification Service
 *
 * Handles DNS TXT record verification for custom domain ownership
 */

import { promises as dns } from 'dns';

/**
 * Generate a verification token for domain ownership
 */
export function generateVerificationToken(): string {
  // Generate a random token (32 characters)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Verify domain ownership via DNS TXT record
 *
 * Expected TXT record format:
 * _jithub-verify.example.com TXT "verification-token-here"
 *
 * @param domain - Domain to verify (e.g., "example.com")
 * @param expectedToken - Expected verification token
 * @returns true if verification succeeds, false otherwise
 */
export async function verifyDomainOwnership(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; error?: string }> {
  try {
    // Construct the verification subdomain
    const verificationDomain = `_jithub-verify.${domain}`;

    console.log(`[DNS Verify] Checking TXT records for: ${verificationDomain}`);

    // Resolve TXT records
    const txtRecords = await dns.resolveTxt(verificationDomain);

    console.log(`[DNS Verify] Found ${txtRecords.length} TXT records`);

    // TXT records are returned as arrays of strings
    // Each record is an array because TXT records can have multiple strings
    for (const record of txtRecords) {
      // Join multiple strings in the record
      const recordValue = record.join('');

      console.log(`[DNS Verify] Checking record: ${recordValue}`);

      if (recordValue === expectedToken) {
        console.log('[DNS Verify] Verification token matched!');
        return { verified: true };
      }
    }

    console.log('[DNS Verify] No matching verification token found');
    return {
      verified: false,
      error: 'Verification token not found in DNS TXT records',
    };
  } catch (error) {
    console.error('[DNS Verify] Error:', error);

    // Common DNS errors
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        return {
          verified: false,
          error: 'DNS record not found. Please ensure you have created the TXT record.',
        };
      }
      if (error.message.includes('ENODATA')) {
        return {
          verified: false,
          error: 'No TXT records found for this domain.',
        };
      }
    }

    return {
      verified: false,
      error: error instanceof Error ? error.message : 'DNS verification failed',
    };
  }
}

/**
 * Get instructions for domain verification
 */
export function getVerificationInstructions(
  domain: string,
  token: string
): {
  record: string;
  type: string;
  value: string;
  instructions: string[];
} {
  return {
    record: `_jithub-verify.${domain}`,
    type: 'TXT',
    value: token,
    instructions: [
      `1. Go to your DNS provider (e.g., Cloudflare, Route53, GoDaddy)`,
      `2. Add a new TXT record with the following details:`,
      `   - Name/Host: _jithub-verify.${domain}`,
      `   - Type: TXT`,
      `   - Value: ${token}`,
      `3. Wait for DNS propagation (usually 5-10 minutes)`,
      `4. Click "Verify Domain" below to complete verification`,
    ],
  };
}
