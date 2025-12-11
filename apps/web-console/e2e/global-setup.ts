import { dbHelper } from './fixtures/database-helper';

/**
 * Global setup for E2E tests
 * Runs once before all tests
 */
async function globalSetup() {
  console.log('E2E Global Setup: Cleaning up test data...');

  try {
    // Clean up any leftover test data from previous runs
    await dbHelper.cleanup();
    console.log('E2E Global Setup: Test data cleaned successfully');
  } catch (error) {
    console.error('E2E Global Setup: Error cleaning test data:', error);
    // Don't fail setup if cleanup fails - tests should handle their own cleanup
  }
}

export default globalSetup;
