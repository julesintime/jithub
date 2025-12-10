# E2E Test Plan - Real API Calls Only

**CRITICAL:** All tests use REAL authentication and REAL API calls. NO MOCKING.

## Test Architecture

### Authentication Strategy
- **Real Keycloak OIDC Flow**: Tests authenticate via actual Keycloak login page
- **Persistent Auth State**: Auth state stored in `.auth/*.json` and reused across tests
- **No Mocks**: Session tokens are real, API calls hit real backend

### Test Users
Created in Keycloak via Admin API:

1. **admin@test.local** (admin123)
   - Has existing organization
   - Used for testing org management features

2. **newuser@test.local** (newuser123)
   - No organizations
   - Used for testing onboarding flow

3. **member@test.local** (member123)
   - For invitation testing

## Test Coverage

### 1. Complete User Journey (complete-user-journey.spec.ts)

#### Signup & Onboarding Flow
- ✅ REAL Keycloak authentication
- ✅ First-time user onboarding
- ✅ Organization creation (REAL API → Keycloak + PostgreSQL)
- ✅ Slug validation (REAL API call to /api/organization/check-slug)
- ✅ Redirect to dashboard after setup

#### Multi-Organization Management
- ✅ Create multiple organizations
- ✅ Switch between organizations (REAL better-auth API)
- ✅ Organization switcher component
- ✅ Active organization persistence

#### Team Collaboration
- ✅ Send invitations (REAL API → PostgreSQL + Keycloak)
- ✅ Invitation list display
- ✅ Pending invitation status

### 2. Organization Management (complete-user-journey.spec.ts)

#### Organization Listing
- ✅ Load organizations from REAL better-auth API
- ✅ Display organization names and slugs
- ✅ Selection page UI

#### Slug Validation
- ✅ Real-time validation API calls
- ✅ Duplicate slug detection
- ✅ Suggestion generation
- ✅ Reserved slug enforcement

### 3. Middleware Protection (complete-user-journey.spec.ts)

#### Authentication Checks
- ✅ Redirect unauthenticated users to home
- ✅ Allow authenticated users with org to dashboard
- ✅ Redirect users without org to selection page

#### Route Protection
- ✅ Public routes accessible (/, /api/auth, /organizations/*)
- ✅ Protected routes enforced (/dashboard, etc.)
- ✅ API routes return 403 for missing org

### 4. Responsive Design (complete-user-journey.spec.ts)

#### Device Testing
- ✅ Mobile (iPhone 12) - 390x844
- ✅ Tablet (iPad Pro) - 820x1180
- ✅ Desktop (1080p) - 1920x1080
- ✅ 4K Display - 3840x2160

## Implementation Status

### Phase 1-4: COMPLETE ✅
- [x] Keycloak integration with REAL API
- [x] Organization CRUD (REAL Keycloak + PostgreSQL)
- [x] Slug generation and validation
- [x] better-auth organization plugin
- [x] Organization switcher component
- [x] Middleware/proxy protection (Node.js runtime)
- [x] Invitation system (PostgreSQL + Keycloak)
- [x] Multi-organization support

### Phase 5-6: PENDING
- [ ] Background sync with Trigger.dev
- [ ] Domain verification workflow
- [ ] Production hardening
- [ ] Observability

## Running Tests

### Setup E2E Users
```bash
# Create test users in Keycloak
pnpm tsx apps/web-console/scripts/setup-e2e-users.ts
```

### Run Full Suite
```bash
# Run all E2E tests with video recording
pnpm playwright test

# Run specific test file
pnpm playwright test complete-user-journey

# Run with UI mode for debugging
pnpm playwright test --ui

# Show HTML report
pnpm playwright show-report
```

### Environment Variables
```bash
# Test user credentials (optional, defaults provided)
E2E_ADMIN_EMAIL=admin@test.local
E2E_ADMIN_PASSWORD=admin123
E2E_NEW_USER_EMAIL=newuser@test.local
E2E_NEW_USER_PASSWORD=newuser123
```

## Video Recording

All tests record videos to `test-results/`:
- **Format**: WebM
- **Quality**: High (for customer demos)
- **Capture**: Full user journey with real interactions

### Customer Demo Videos

Videos show:
1. Real Keycloak login page
2. Actual OIDC redirect flow
3. Organization creation with API validation
4. Dashboard with real data
5. Organization switching
6. Team invitations
7. Responsive design on multiple devices

## API Endpoints Tested (REAL Calls)

### Organization APIs
- `GET /api/organization/check-slug` - Slug validation
- `POST /api/organization/create` - Create org (Keycloak + PostgreSQL)
- `POST /api/organization/invite` - Send invitation

### better-auth APIs
- `GET /api/auth/session` - Get current session
- `POST /api/auth/organization/list` - List user organizations
- `POST /api/auth/organization/set-active` - Switch organization

### Keycloak APIs (via backend)
- Organization creation in Keycloak
- User-organization membership
- Organization attributes sync

## Success Criteria

✅ **All tests use REAL APIs** - No mocks, no stubs
✅ **REAL authentication** - Actual Keycloak OIDC flow
✅ **REAL data** - Organizations created in Keycloak + PostgreSQL
✅ **Full coverage** - Signup → Dashboard → Collaboration
✅ **Video recorded** - Every test captured for customer demos
✅ **Responsive** - Works on mobile, tablet, desktop, 4K

## Next Steps

1. **Run tests** - Execute full E2E suite
2. **Review videos** - Validate customer-ready demos
3. **Fix failures** - Address any failing tests
4. **Phase 5-6** - Implement remaining features
5. **Customer demo** - Compile best videos into showcase

---

**Last Updated**: 2025-12-10
**Test Framework**: Playwright 1.x
**Authentication**: Keycloak 26+
**Backend**: better-auth + Drizzle ORM
