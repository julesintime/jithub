'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

interface OrganizationSwitcherProps {
  organizations: Organization[];
  activeOrganizationId?: string | null;
}

/**
 * Organization Switcher Component
 *
 * Allows users to switch between organizations they belong to.
 * Uses better-auth's built-in setActive functionality.
 *
 * @see https://www.better-auth.com/docs/plugins/organization#set-active-organization
 */
export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: OrganizationSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);

  const activeOrg = organizations.find((org) => org.id === activeOrganizationId);

  const handleSwitch = async (organizationId: string) => {
    if (organizationId === activeOrganizationId) return;

    setIsLoading(true);
    try {
      await authClient.organization.setActive({
        organizationId,
      });

      // Refresh the page to update the UI with new org context
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch organization:', error);
      setIsLoading(false);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[200px] justify-between"
          disabled={isLoading}
        >
          {activeOrg ? (
            <span className="flex items-center gap-2">
              {activeOrg.logo && (
                <img
                  src={activeOrg.logo}
                  alt={activeOrg.name}
                  className="h-4 w-4 rounded"
                />
              )}
              <span className="truncate">{activeOrg.name}</span>
            </span>
          ) : (
            <span>Select organization...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitch(org.id)}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {org.logo && (
                <img
                  src={org.logo}
                  alt={org.name}
                  className="h-4 w-4 rounded"
                />
              )}
              <span className="truncate">{org.name}</span>
            </span>
            {org.id === activeOrganizationId && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => (window.location.href = '/organizations/new')}>
          <Plus className="mr-2 h-4 w-4" />
          <span>Create organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
