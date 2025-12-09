'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingCarousel, OnboardingStep } from '@/components/onboarding/onboarding-carousel';
import { OrganizationForm } from '@/components/onboarding/organization-form';
import { useSession } from '@/lib/auth/client';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [organization, setOrganization] = useState<{
    id: string;
    name: string;
    slug: string;
    keycloakOrgId: string;
  } | null>(null);

  useEffect(() => {
    // If not authenticated, redirect to home
    if (!isPending && !session) {
      router.push('/');
    }
  }, [session, isPending, router]);

  const handleOrganizationCreated = (org: {
    id: string;
    name: string;
    slug: string;
    keycloakOrgId: string;
  }) => {
    setOrganization(org);
    // Automatically advance to next step
    setTimeout(() => {
      const nextButton = document.querySelector('[data-carousel-next]') as HTMLButtonElement;
      if (nextButton) nextButton.click();
    }, 500);
  };

  const handleComplete = async () => {
    // Redirect to dashboard
    router.push('/');
  };

  const onboardingSteps: OnboardingStep[] = [
    {
      title: 'Welcome to JTT Platform',
      description: 'Let\'s get you set up in just a few steps',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Welcome! This platform helps you manage users and activate services
            for your organization.
          </p>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-semibold">1</span>
              </div>
              <div>
                <h4 className="font-medium">User Management</h4>
                <p className="text-muted-foreground">
                  Manage user accounts, permissions, and access control
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-semibold">2</span>
              </div>
              <div>
                <h4 className="font-medium">Service Activation</h4>
                <p className="text-muted-foreground">
                  Enable and configure platform services
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-semibold">3</span>
              </div>
              <div>
                <h4 className="font-medium">Organization Management</h4>
                <p className="text-muted-foreground">
                  Manage your organization settings and members
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Create Your Organization',
      description: 'Choose a name for your organization',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Create an organization to manage your team, projects, and settings.
            You'll be the owner and can invite team members later.
          </p>
          <OrganizationForm onSuccess={handleOrganizationCreated} />
        </div>
      ),
    },
    {
      title: 'Organization Created!',
      description: 'Your organization is ready to use',
      content: (
        <div className="space-y-4">
          {organization && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
              <div className="text-center space-y-3">
                <div className="text-4xl">🎉</div>
                <div>
                  <h3 className="text-xl font-semibold">{organization.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {organization.slug}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-background/50">
                  <span className="font-medium">Role</span>
                  <span className="text-muted-foreground">Owner</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-background/50">
                  <span className="font-medium">Members</span>
                  <span className="text-muted-foreground">1 (you)</span>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            You can manage organization settings, invite team members, and configure
            permissions from your dashboard.
          </p>
        </div>
      ),
    },
    {
      title: 'Dashboard Overview',
      description: 'Navigate your platform console',
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Your dashboard provides quick access to:
          </p>
          <div className="grid gap-3">
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-1">Statistics</h4>
              <p className="text-sm text-muted-foreground">
                View real-time metrics for users, services, and activations
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-1">User Management</h4>
              <p className="text-sm text-muted-foreground">
                Add, remove, and manage user permissions
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-medium mb-1">Service Activation</h4>
              <p className="text-sm text-muted-foreground">
                Enable and configure services for your organization
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'All Set!',
      description: 'You\'re ready to start using the platform',
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-6 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h4 className="font-semibold mb-2">You're All Set!</h4>
            <p className="text-sm text-muted-foreground">
              Click "Get Started" below to begin managing your platform
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Need help? Check our documentation or contact support
          </div>
        </div>
      ),
    },
  ];

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <OnboardingCarousel
        steps={onboardingSteps}
        onComplete={handleComplete}
      />
    </div>
  );
}
