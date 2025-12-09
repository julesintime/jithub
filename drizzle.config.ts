import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/web-console/src/lib/db/schema.ts',
  out: './apps/web-console/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./apps/web-console/local.db',
  },
});
