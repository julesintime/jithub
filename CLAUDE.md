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

**Fresh Session Protocol:**
1. **ALWAYS start by reading GitHub issues**: `gh issue list --label "epic" --state open`
2. **Read specific issue**: `gh issue view ISSUE_NUMBER`
3. **Check current branch**: `git status` and `git branch`
4. **Pull latest**: `git pull origin main`
5. **Read CLAUDE.md** for project context
6. **Check .env** for service credentials (already configured)
7. **Implement from issues** - one issue at a time
8. **Test with real APIs** - NO mock data (credentials in `.env`)
9. **Commit frequently**: `git add . && git commit -m "..." && git push`

**Commit Strategy:**
- Commit frequency: Every 15-30 minutes MINIMUM
- Use branches for features/fixes
- DO NOT create temporary files like markdown drafts or "_revised" files
- Use commits and branches instead of temporary artifacts
- All context and progress tracked via GitHub issues with common labels

**GitHub CLI (`gh`) Usage:**
- `gh` CLI is already authenticated and configured
- ALWAYS use `gh` CLI for creating issues, epics, and PRs
- Use common labels for consistency: `epic`, `feature`, `bug`, `migration`, `phase:1`, `phase:2`, etc.
- Create epics immediately after planning - right after finalizing plan
- Link related issues to epics for organization

**Issue-Driven Development:**
- GitHub issues serve as the primary tracking mechanism
- Use common labels consistently (`epic`, `feature`, `bug`, `priority:high/medium/low`, `phase:N`)
- Record progress and submit updates frequently
- Issues capture context, session state, and project information
- **Create epics and issues using `gh` CLI immediately after planning:**
  ```bash
  # Create epic
  gh issue create --title "[EPIC] Epic Title" \
    --body "Epic description with phases and goals" \
    --label "epic,priority:high,phase:1"

  # Create feature issue linked to epic
  gh issue create --title "Feature: Feature Title" \
    --body "Description\n\nRelated to #EPIC_NUMBER" \
    --label "feature,phase:1,priority:high"

  # Create sub-tasks
  gh issue create --title "Task: Specific Task" \
    --body "Task details\n\nPart of #FEATURE_NUMBER" \
    --label "task,phase:1"
  ```
- **Always create GitHub issues right after planning, before implementation**

**Vibe Coding Approach:**
- Solo developer workflow with AI agents
- Focus on automation: tests, settings, CI/CD
- No manual oversight - design for full automation
- All workflows must be reproducible and automated

**Output Philosophy:**
- DO NOT output verbose markdown documentation
- Use GitHub issues for tracking instead
- DO NOT create workaround files or temporary files
- Use proper git workflow (commits, branches, PRs)
- Keep documentation minimal and actionable

## Environment

- Runs in Coder workspace
- Docker available for containerized services
- PostgreSQL runs in Docker
- Keycloak runs in Docker

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
