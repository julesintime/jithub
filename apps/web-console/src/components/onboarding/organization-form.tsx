'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateSlug } from '@/lib/utils/slug';
import { cn } from '@/lib/utils';

interface OrganizationFormProps {
  onSuccess: (organization: {
    id: string;
    name: string;
    slug: string;
    keycloakOrgId: string;
  }) => void;
  onCancel?: () => void;
}

export function OrganizationForm({ onSuccess, onCancel }: OrganizationFormProps) {
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Auto-generate slug from organization name
  useEffect(() => {
    if (orgName) {
      const newSlug = generateSlug(orgName);
      setSlug(newSlug);
    } else {
      setSlug('');
      setSlugAvailable(null);
      setSlugError(null);
    }
  }, [orgName]);

  // Check slug availability when slug changes
  useEffect(() => {
    if (!slug) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    const checkSlugAvailability = async () => {
      setIsCheckingSlug(true);
      setSlugError(null);
      setSlugSuggestions([]);

      try {
        const response = await fetch(`/api/organization/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (data.available) {
          setSlugAvailable(true);
          setSlugError(null);
        } else {
          setSlugAvailable(false);
          setSlugError(data.error || 'Slug is not available');
          setSlugSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugError('Failed to check slug availability');
        setSlugAvailable(false);
      } finally {
        setIsCheckingSlug(false);
      }
    };

    // Debounce the slug check
    const timer = setTimeout(checkSlugAvailability, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orgName || !slug || !slugAvailable) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/organization/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: orgName, slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Call success callback with organization data
      onSuccess(data.organization);
    } catch (error) {
      console.error('Error creating organization:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setOrgName(suggestion.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '));
  };

  const canSubmit = orgName && slug && slugAvailable && !isCheckingSlug && !isCreating;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization Name</Label>
          <Input
            id="orgName"
            type="text"
            placeholder="Acme Inc"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            disabled={isCreating}
            className="text-base"
            autoComplete="organization"
            required
          />
          <p className="text-xs text-muted-foreground">
            This is the public name of your organization
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">
            Organization Slug
            {isCheckingSlug && (
              <span className="ml-2 text-xs text-muted-foreground">(checking...)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isCreating}
              className={cn(
                'text-base font-mono',
                slugAvailable === true && 'border-green-500 focus-visible:ring-green-500',
                slugAvailable === false && 'border-destructive focus-visible:ring-destructive'
              )}
              required
            />
            {slugAvailable === true && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                ✓
              </div>
            )}
            {slugAvailable === false && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                ✗
              </div>
            )}
          </div>

          {slugError && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{slugError}</p>
              {slugSuggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {slugSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 font-mono"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!slugError && slug && (
            <p className="text-xs text-muted-foreground">
              Your organization URL will be: <span className="font-mono">{slug}</span>
            </p>
          )}
        </div>
      </div>

      {createError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{createError}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isCreating}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {isCreating ? 'Creating...' : 'Create Organization'}
        </Button>
      </div>
    </form>
  );
}
