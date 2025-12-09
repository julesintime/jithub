# Initialization Guide

**Run these steps ONCE when setting up a fresh Coder workspace.**

## 0. Initialize Nx

Run this step ONCE to initialize an Nx workspace (do this before installing pnpm). If you don't have pnpm yet, use npx which works with npm installed by default.

```bash
# Scaffold a new Nx workspace using npx (no pnpm required)
npx create-nx-workspace@latest
# Follow the interactive prompts and choose the preset you want (for many projects, "empty" is a safe choice).
```

## 1. Install pnpm

```bash
npm install -g pnpm
pnpm --version
```

## 2. Install Trigger.dev CLI

```bash
npm install -g @trigger.dev/cli
trigger --version
```

## 3. Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "noreply@anthropic.com"
```

## 4. Authenticate GitHub CLI

**Already done** - GitHub token in `.env`:
```bash
gh auth status
```

## 5. Create GitHub Labels

```bash
# Epic and priority labels
gh label create "epic" --description "Epic issue" --color "8B00FF" || true
gh label create "priority:critical" --description "Critical priority" --color "FF0000" || true
gh label create "priority:high" --description "High priority" --color "FF6B00" || true
gh label create "priority:medium" --description "Medium priority" --color "FFB800" || true
gh label create "priority:low" --description "Low priority" --color "00C853" || true

# Phase labels
gh label create "phase:1" --description "Phase 1: Foundation" --color "0052CC" || true
gh label create "phase:2" --description "Phase 2: Shared Libraries" --color "0052CC" || true
gh label create "phase:3" --description "Phase 3: App Migration" --color "0052CC" || true
gh label create "phase:4" --description "Phase 4: Testing" --color "0052CC" || true
gh label create "phase:5" --description "Phase 5: Database" --color "0052CC" || true
gh label create "phase:6" --description "Phase 6: Build Pipeline" --color "0052CC" || true
gh label create "phase:7" --description "Phase 7: Validation" --color "0052CC" || true

# Type labels
gh label create "migration" --description "Migration work" --color "5319E7" || true
gh label create "feature" --description "New feature" --color "00D084" || true
gh label create "bug" --description "Bug fix" --color "D73A4A" || true
gh label create "task" --description "Task" --color "1D76DB" || true
gh label create "documentation" --description "Documentation" --color "0075CA" || true
```

## 6. Verify PostgreSQL

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=jtt_platform \
  -p 5432:5432 \
  postgres:16
```

## 7. Verify Environment Variables

```bash
# Check .env exists and has required vars
cat .env | grep -E "(KEYCLOAK|TRIGGER|DATABASE_URL|GITHUB_TOKEN)"
```

## 8. Install Dependencies

```bash
# Will be done after workspace setup in Phase 1.2
pnpm install
```

## 9. Verify Services are Accessible

```bash
# Keycloak
curl -s https://keycloak.xuperson.org/health | head -n 1

# Trigger.dev
curl -s https://trigger.xuperson.org | head -n 1

# Gitea
curl -s https://git.xuperson.org | head -n 1
```

## 10. Initial Commit

```bash
git add .
git commit -m "chore: workspace initialization"
git push
```

---

## Verification Checklist

- [ ] pnpm installed
- [ ] Trigger.dev CLI installed
- [ ] Git configured
- [ ] GitHub CLI authenticated
- [ ] GitHub labels created
- [ ] PostgreSQL running
- [ ] .env verified
- [ ] Services accessible
- [ ] Initial commit pushed

---

**IMPORTANT**: Run these steps in a fresh workspace before starting Phase 1.
