import { cn } from '../lib/utils';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">JTT Platform Console</h1>
            <nav className="flex gap-4">
              <a
                href="#"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </a>
              <a
                href="#"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Users
              </a>
              <a
                href="#"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Services
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage users and activate services for your platform
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <StatCard
            title="Total Users"
            value="0"
            description="Active users in the system"
          />
          <StatCard
            title="Active Services"
            value="0"
            description="Services currently running"
          />
          <StatCard
            title="Pending Activations"
            value="0"
            description="Services awaiting activation"
          />
        </div>

        {/* Content Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Management Section */}
          <section className={cn('rounded-lg border bg-card p-6')}>
            <h3 className="text-xl font-semibold mb-4">User Management</h3>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage user accounts, permissions, and access control.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                <span className="text-sm">No users configured</span>
              </div>
            </div>
          </section>

          {/* Service Activation Section */}
          <section className={cn('rounded-lg border bg-card p-6')}>
            <h3 className="text-xl font-semibold mb-4">Service Activation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enable and configure platform services for your organization.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                <span className="text-sm">No services available</span>
              </div>
            </div>
          </section>
        </div>

        {/* Tech Stack Info */}
        <div className="mt-8 p-6 rounded-lg border bg-card">
          <h3 className="text-lg font-semibold mb-3">Tech Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Frontend</div>
              <div className="text-muted-foreground">Next.js + shadcn/ui</div>
            </div>
            <div>
              <div className="font-medium">Backend</div>
              <div className="text-muted-foreground">Hono + Drizzle ORM</div>
            </div>
            <div>
              <div className="font-medium">Auth</div>
              <div className="text-muted-foreground">
                better-auth + Keycloak
              </div>
            </div>
            <div>
              <div className="font-medium">Automation</div>
              <div className="text-muted-foreground">
                Trigger.dev + Mastra
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-6')}>
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}
