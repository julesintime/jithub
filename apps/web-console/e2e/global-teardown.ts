import { dbHelper } from './fixtures/database-helper';
import { keycloakHelper } from './fixtures/keycloak-helper';

/**
 * Global teardown for E2E tests
 * Runs once after all tests complete
 */
async function globalTeardown() {
  console.log('E2E Global Teardown: Cleaning up test data...');

  try {
    // Clean up database test data
    await dbHelper.cleanup();
    console.log('E2E Global Teardown: Database cleaned');

    // Clean up Keycloak test users (if any were created)
    try {
      await keycloakHelper.cleanupTestUsers();
      console.log('E2E Global Teardown: Keycloak test users cleaned');
    } catch (error) {
      // Keycloak cleanup is optional - may not be available
      console.log('E2E Global Teardown: Keycloak cleanup skipped (may not be available)');
    }

    console.log('E2E Global Teardown: Complete');
  } catch (error) {
    console.error('E2E Global Teardown: Error:', error);
  }
}

export default globalTeardown;
