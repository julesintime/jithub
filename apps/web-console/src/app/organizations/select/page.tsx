'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { OrganizationSwitcher } from '@/components/organization-switcher';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * Organization Selection Page
 *
 * Shown when user doesn't have an active organization.
 * Uses better-auth organization plugin to list and select organizations.
 *
 * @see https://www.better-auth.com/docs/plugins/organization
 */
export default function OrganizationSelectPage() {
  const { data: session, isPending } = authClient.useSession();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizations() {
      try {
        // Use better-auth's client method to list organizations
        const orgs = await authClient.organization.list();
        setOrganizations(orgs || []);
      } catch (error) {
        console.error('Failed to load organizations:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!isPending && session?.user) {
      loadOrganizations();
    }
  }, [session, isPending]);

  if (isPending || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Not authenticated</h1>
          <p className="text-muted-foreground mt-2">
            Please sign in to continue.
          </p>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold">No organizations</h1>
          <p className="text-muted-foreground mt-2">
            You're not a member of any organizations yet.
          </p>
          <p className="text-muted-foreground mt-1">
            Create one to get started.
          </p>
          <Button
            onClick={() => (window.location.href = '/organizations/new')}
            className="mt-4"
          >
            Create organization
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Select an organization</h1>
          <p className="text-muted-foreground mt-2">
            Choose which organization you want to work with.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={async () => {
                await authClient.organization.setActive({
                  organizationId: org.id,
                });
                window.location.href = '/dashboard';
              }}
              className="p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-left"
            >
              <div className="font-medium">{org.name}</div>
              {org.slug && (
                <div className="text-sm text-muted-foreground">
                  /{org.slug}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/organizations/new')}
            className="w-full"
          >
            Create new organization
          </Button>
        </div>
      </div>
    </div>
  );
}
