# JTT Platform

Full-stack Nx monorepo for user management and service activation dashboard.

## Tech Stack

- **Frontend:** Next.js 16 + shadcn/ui + Tailwind CSS
- **Backend:** Hono + Node.js
- **Database:** PostgreSQL + Drizzle ORM
- **Authentication:** better-auth (session) + Keycloak (OIDC provider)
- **AI & Workflows:** Mastra + Trigger.dev
- **Monorepo:** Nx workspace
- **Package Manager:** pnpm

## Applications

### `web-console`
Next.js application for the web dashboard interface.
- User management interface
- Service activation controls
- Built with shadcn/ui components
- Tailwind CSS for styling

**Dev server:** `nx serve web-console`

### `api-console`
Hono-based API server for backend operations.
- RESTful API endpoints
- User management routes
- Service management routes
- Health check endpoint

**Dev server:** `nx serve api-console`

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ (running in Docker)
- Nx CLI (optional, installed as dev dependency)

### Installation

```bash
# Install dependencies
pnpm install

# Run both apps in development mode
pnpm dev

# Or run individually
nx serve web-console  # Frontend on http://localhost:3000
nx serve api-console  # Backend on http://localhost:3001
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jtt_platform

# Keycloak
KEYCLOAK_BASE_URL=https://keycloak.example.com
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Trigger.dev
TRIGGER_SECRET_KEY=your-trigger-secret
TRIGGER_API_URL=https://trigger.example.com
TRIGGER_PROJECT_REF=your-project-ref

# GitHub
GITHUB_TOKEN=your-github-token

# App URLs
WEB_CONSOLE_URL=http://localhost:3000
API_CONSOLE_URL=http://localhost:3001
```

## Project Structure

```
jithub/
├── apps/
│   ├── web-console/          # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/          # App router pages
│   │   │   ├── lib/          # Utility functions
│   │   │   └── components/   # React components (to be added)
│   │   ├── tailwind.config.ts
│   │   └── postcss.config.js
│   │
│   └── api-console/          # Hono backend API
│       ├── src/
│       │   └── main.ts       # API server entry point
│       └── tsconfig.json
│
├── .claude/                  # Claude Code configuration
├── nx.json                   # Nx workspace configuration
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # pnpm workspace configuration
└── tsconfig.base.json        # Base TypeScript configuration
```

## Available Scripts

```bash
# Development
pnpm dev              # Run all apps in dev mode
nx serve web-console  # Run web console
nx serve api-console  # Run API console

# Build
nx build web-console  # Build web console
nx build api-console  # Build API console
nx build --all        # Build all apps

# Testing
nx test web-console   # Test web console
nx test api-console   # Test API console
nx test --all         # Test all apps

# Linting
nx lint web-console   # Lint web console
nx lint api-console   # Lint API console
nx lint --all         # Lint all apps
```

## Features

### Current
- ✅ Nx monorepo setup
- ✅ Next.js web console with App Router
- ✅ Hono API server
- ✅ Tailwind CSS + shadcn/ui foundation
- ✅ TypeScript configuration
- ✅ Dashboard layout

### Planned
- 🔄 User authentication with Keycloak + better-auth
- 🔄 User management interface
- 🔄 Service activation workflows
- 🔄 Database schema with Drizzle ORM
- 🔄 Trigger.dev workflow automation
- 🔄 Mastra AI agent integration
- 🔄 Role-based access control
- 🔄 Service monitoring dashboard

## Development Workflow

This project follows an **ephemeral workspace** approach:
- Commit frequently (every 15-30 minutes minimum)
- Use GitHub issues for tracking
- All context in `.claude/` directory must be committed
- Only the git repo is synced - commit or lose changes

## Authentication Flow

Authentication uses a **Keycloak-first** approach:
1. Keycloak handles all auth UI (login, signup, password reset, 2FA)
2. better-auth manages sessions via OIDC callback
3. Web app has NO auth UI - redirects to Keycloak
4. User metadata synced to local PostgreSQL or stored in Keycloak attributes

## Contributing

1. Create feature branch from `main`
2. Make changes and test locally
3. Commit with semantic commit messages
4. Push and create pull request
5. Use GitHub issues for tracking work

## License

Private - All Rights Reserved
