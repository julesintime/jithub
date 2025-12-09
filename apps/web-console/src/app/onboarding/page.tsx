'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingCarousel, OnboardingStep } from '@/components/onboarding/onboarding-carousel';
import { useSession } from '@/lib/auth/client';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If not authenticated, redirect to home
    if (!isPending && !session) {
      router.push('/');
    }
  }, [session, isPending, router]);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Mark onboarding as complete
      await fetch('/api/onboarding/complete', {
        method: 'POST',
      });

      // Redirect to dashboard
      router.push('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
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
      title: 'Your Organization',
      description: 'You have been added to your organization',
      content: (
        <div className="space-y-4">
          {session?.user?.email && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email</span>
                  <span className="text-sm text-muted-foreground">
                    {session.user.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Organization</span>
                  <span className="text-sm text-muted-foreground">
                    {session.user.email.split('@')[1]}
                  </span>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Your organization has been automatically created based on your email
            domain. You can manage organization settings and invite team members
            from the dashboard.
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
