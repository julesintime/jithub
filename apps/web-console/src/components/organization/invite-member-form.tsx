'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface InviteMemberFormProps {
  organizationId: string;
  onSuccess?: (invitation: {
    id: string;
    email: string;
    role: string;
    status: string;
  }) => void;
  onCancel?: () => void;
}

export function InviteMemberForm({
  organizationId,
  onSuccess,
  onCancel,
}: InviteMemberFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'member' | 'admin' | 'owner'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    setIsInviting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          email,
          role,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      // Success!
      setSuccess(true);
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('member');

      if (onSuccess) {
        onSuccess(data.invitation);
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name (Optional)</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isInviting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name (Optional)</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isInviting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isInviting}
            required
          />
          <p className="text-xs text-muted-foreground">
            User will receive an invitation email from Keycloak
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'member' | 'admin' | 'owner')}
            disabled={isInviting}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="member">Member - Can view and use resources</option>
            <option value="admin">Admin - Can manage members and settings</option>
            <option value="owner">Owner - Full access and control</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
          <p className="text-sm text-green-600 dark:text-green-400">
            Invitation sent successfully! The user will receive an email from Keycloak.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isInviting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isInviting || !email}>
          {isInviting ? 'Sending...' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
}
