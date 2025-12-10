/**
 * Setup E2E Test Users in Keycloak
 *
 * Creates test users in Keycloak for E2E testing.
 * Uses REAL Keycloak Admin API - NO MOCKING.
 *
 * Run with: pnpm tsx apps/web-console/scripts/setup-e2e-users.ts
 */

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL || 'https://keycloak.xuperson.org';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

interface TestUser {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const TEST_USERS: TestUser[] = [
  {
    username: 'e2e-admin',
    email: 'admin@test.local',
    password: 'admin123',
    firstName: 'Test',
    lastName: 'Admin',
  },
  {
    username: 'e2e-newuser',
    email: 'newuser@test.local',
    password: 'newuser123',
    firstName: 'New',
    lastName: 'User',
  },
  {
    username: 'e2e-member',
    email: 'member@test.local',
    password: 'member123',
    firstName: 'Team',
    lastName: 'Member',
  },
];

/**
 * Get Keycloak admin access token
 */
async function getAdminToken(): Promise<string> {
  const response = await fetch(
    `${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: KEYCLOAK_ADMIN_USER,
        password: KEYCLOAK_ADMIN_PASSWORD,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get admin token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create user in Keycloak
 */
async function createUser(token: string, user: TestUser): Promise<void> {
  // Check if user already exists
  const checkResponse = await fetch(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${user.username}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const existingUsers = await checkResponse.json();
  if (existingUsers.length > 0) {
    console.log(`✓ User ${user.username} already exists`);
    return;
  }

  // Create user
  const createResponse = await fetch(
    `${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}/users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: true,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: user.password,
            temporary: false,
          },
        ],
      }),
    }
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create user ${user.username}: ${error}`);
  }

  console.log(`✓ Created user ${user.username} (${user.email})`);
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 Setting up E2E test users in Keycloak...\n');
  console.log(`Keycloak: ${KEYCLOAK_BASE_URL}`);
  console.log(`Realm: ${KEYCLOAK_REALM}\n`);

  try {
    // Get admin token
    console.log('🔑 Getting admin access token...');
    const token = await getAdminToken();
    console.log('✓ Got admin token\n');

    // Create test users
    console.log('👥 Creating test users...');
    for (const user of TEST_USERS) {
      await createUser(token, user);
    }

    console.log('\n✅ E2E test users setup complete!\n');
    console.log('Test user credentials:');
    TEST_USERS.forEach((user) => {
      console.log(`  ${user.email} / ${user.password}`);
    });
    console.log('\nYou can now run: pnpm playwright test');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();
