'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession, linkKeycloakAccount, unlinkAccount } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Link2, Unlink, Loader2 } from 'lucide-react';

interface ConnectedAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: Date;
}

// Wrapper component with Suspense
export default function ConnectedAccountsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ConnectedAccountsContent />
    </Suspense>
  );
}

function ConnectedAccountsContent() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for link success parameter
  useEffect(() => {
    const linked = searchParams.get('linked');
    if (linked) {
      setMessage({
        type: 'success',
        text: `Successfully linked ${linked} account!`,
      });
      // Clear the URL parameter
      window.history.replaceState({}, '', '/settings/accounts');
    }
  }, [searchParams]);

  // Fetch connected accounts
  useEffect(() => {
    // TODO: Implement API to fetch connected accounts
    // For now, we'll check if user has keycloak account linked
    // This would need a server-side endpoint to fetch from account table
  }, [session]);

  const handleLinkKeycloak = async () => {
    try {
      setLoading(true);
      await linkKeycloakAccount();
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to initiate account linking',
      });
      setLoading(false);
    }
  };

  const handleUnlinkAccount = async (providerId: string) => {
    try {
      setLoading(true);
      await unlinkAccount(providerId);
      setMessage({
        type: 'success',
        text: `Successfully unlinked ${providerId} account`,
      });
      // Refresh accounts list
      // TODO: Re-fetch accounts
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to unlink account',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p>Please sign in to manage your connected accounts.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Connected Accounts</h1>

      {message && (
        <div
          className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>External Logins</CardTitle>
          <CardDescription>
            Connect your account to external authentication providers for easier sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Keycloak SSO */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Keycloak SSO</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in with your organization's Single Sign-On
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLinkKeycloak}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </Button>
            </div>

            {/* Email/Password status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Email & Password</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Primary</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>
            Manage your account security settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Email Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Your email address has been verified
                </p>
              </div>
              {session.user.emailVerified ? (
                <Badge className="bg-green-100 text-green-800">Verified</Badge>
              ) : (
                <Badge variant="destructive">Not Verified</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
