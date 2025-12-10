'use client';

import { authClient } from '@/lib/auth/client';

/**
 * Hook to access user's organizations and active organization
 *
 * Uses better-auth's organization plugin client methods
 *
 * @see https://www.better-auth.com/docs/plugins/organization
 */
export function useOrganizations() {
  const { data: session } = authClient.useSession();

  return {
    activeOrganizationId: session?.session?.activeOrganizationId,
    user: session?.user,
    session: session?.session,
  };
}

/**
 * Hook to list user's organizations
 *
 * @see https://www.better-auth.com/docs/plugins/organization#list-organizations
 */
export function useListOrganizations() {
  // Better-auth provides organization.listOrganizations() client method
  // This would typically be used with a React Query hook
  // For now, we'll fetch organizations server-side and pass as props
  return authClient.useListOrganizations();
}
