import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.KEYCLOAK_BASE_URL = 'https://keycloak.test.com';
process.env.KEYCLOAK_REALM = 'test-realm';
process.env.KEYCLOAK_CLIENT_ID = 'test-client';
process.env.KEYCLOAK_CLIENT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
