'use client';

import { useSession } from '@/lib/auth/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Users, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/lib/auth/client';

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
            <CardDescription>Please sign in to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, {session.user.name || 'User'}!
          </h2>
          <p className="text-gray-600 mt-1">
            {session.session.activeOrganizationId
              ? 'Manage your organization and settings below.'
              : 'Get started by creating or joining an organization.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Organization Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>
                Manage your organization settings and details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.session.activeOrganizationId ? (
                <Link href="/organizations/select">
                  <Button variant="outline" className="w-full">
                    Switch Organization
                  </Button>
                </Link>
              ) : (
                <Link href="/onboarding">
                  <Button className="w-full">Create Organization</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Team Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team
              </CardTitle>
              <CardDescription>
                Invite team members and manage permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                Manage Team (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
              <CardDescription>
                Configure your account and connected services.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/accounts">
                <Button variant="outline" className="w-full">
                  Connected Accounts
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Session Info (for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-sm font-mono">Session Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(
                  {
                    user: {
                      id: session.user.id,
                      email: session.user.email,
                      name: session.user.name,
                      emailVerified: session.user.emailVerified,
                    },
                    activeOrganizationId: session.session.activeOrganizationId,
                  },
                  null,
                  2
                )}
              </pre>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
