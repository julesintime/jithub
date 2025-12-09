# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

## Project Architecture

This is an Nx monorepo for a full-stack application with the following tech stack:

**Frontend:**
- Next.js (React framework)
- shadcn/ui (UI component library)

**Backend:**
- Hono (lightweight web framework)
- Drizzle ORM
- PostgreSQL database

**Authentication & Identity:**
- better-auth (state and session management)
- Keycloak (OIDC provider, single source of truth for identity)
- Identity stored in Keycloak, session managed by better-auth

**AI & Workflow:**
- Mastra (AI agent framework)
- Trigger.dev (workflow automation)

**Infrastructure:**
- Coder workspace with Docker enabled
- GitHub repo issues as context, session, and project tracking

## Development Workflow

**CRITICAL - Ephemeral Workspace:**
- This is a Coder ephemeral workspace - **COMMIT VERY OFTEN OR LOSE EVERYTHING**
- **ONLY the git repo is synced** - home directory is ephemeral
- **ALL project files in .claude/ MUST be committed** (plans, notes, etc.)
- Commit after every significant change (every 15-30 minutes minimum)
- Push to GitHub frequently
- GitHub issues are the PRIMARY CONTEXT - always read issues first
- DO NOT output verbose markdown reports or summaries
- DO NOT create workaround files or temporary files without clean-up
- DO NOT create temporary files like markdown drafts or "_revised" files
- Keep documentation minimal and actionable

**GitHub CLI (`gh`) Usage and issue workflow:**

- `gh` is configured in the workspace — prefer `gh` for quick issue/PR creation and linking, but use the GitHub UI when you need advanced editing.
- Keep labels short and consistent (lowercase). Avoid all-caps or verbose label names.
- Prefer a conventional label set that maps well to commit types and conventional changelogs. Suggested labels:
  - `epic` — large cross-cutting initiative
  - `feat` — new feature (maps to commit type `feat`)
  - `fix` — bug fix (maps to `fix`)
  - `chore` — maintenance tasks (maps to `chore`)
  - `docs` — documentation
  - `refactor` — code changes without behavior change
  - `test` — tests and test infra
  - `ci` — CI/CD and pipeline work
  - `migration` — migrations or infra changes
  - `priority:critical|high|medium|low` — priority buckets
  - `phase:1|phase:2|phase:3` — project phases

- Example quick `gh` commands (non-interactive):
  ```bash
  gh issue create --title "feat: add user profile" --body "Description..." --label "feat,phase:1,priority:high"
  gh issue create --title "epic: user profiles" --body "Epic description..." --label "epic,priority:high"
  gh pr create --fill --label "feat"
  ```

- Keep creation lightweight: create epics when planning is finalized, then create linked feature or task issues under those epics. Link using issue references (e.g. "Part of #123").

- Use labels that match commit convention: prefer `feat`/`fix`/`chore` over verbose `feature`/`bug` for consistency with changelogs and automated release tooling.



## Environment

- Runs in Coder workspace
- Services run in local Kubernetes cluster:
  - PostgreSQL (runs in Docker)
  - Keycloak (OIDC identity provider)
  - Trigger.dev (workflow automation)
  - ERPNext (ERP/CRM system)
  - Coder (development workspaces)
  - Outline (documentation/wiki)
  - Mattermost (team communication)
  - Gitea (Git hosting)
  - Logto (alternative identity provider)
  - Letta AI (AI agent platform)
  - Langfuse (LLM observability)

## MCP Servers

This project uses the following MCP servers configured in `.mcp.json`:
- **nx-mcp**: Nx workspace tooling
- **shadcn**: shadcn/ui component management

## Authentication Flow

**IMPORTANT - Keycloak-First Auth:**
- **NO signup/login pages** in web app - redirect everything to Keycloak
- Keycloak handles: signup, login, password reset, email verification, 2FA
- Keycloak is the OIDC identity provider (single source of truth for identity)
- Keycloak organizations feature is ACTIVATED in realm
- better-auth is the abstraction layer for session management
- Web app only syncs user info locally via OIDC callback
- Additional user metadata stored either:
  - Locally in PostgreSQL database
  - OR in Keycloak custom attributes (as single source of truth)
- Can access Keycloak directly OR use better-auth as intermediate

## Best Practices

- Use Nx commands for all build, test, and run operations
- Follow Next.js and Hono best practices for respective layers
- Use Drizzle schema-first approach for database
- Configure automated tests for all features
- Design workflows in Trigger.dev for automation
- Use Mastra for AI agent capabilities
- Leverage Docker for local development consistency
