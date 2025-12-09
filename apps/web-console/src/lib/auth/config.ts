import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins';
import { keycloak } from 'better-auth/plugins/generic-oauth';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: false,
    camelCase: true,
  }),
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: process.env['KEYCLOAK_CLIENT_ID'] || '',
          clientSecret: process.env['KEYCLOAK_CLIENT_SECRET'] || '',
          issuer: process.env['KEYCLOAK_ISSUER'] || '',
        }),
      ],
    }),
  ],
  baseURL: process.env['NEXT_PUBLIC_APP_URL'] || process.env['CODER_APP_PREVIEW_URL'] || 'http://localhost:3000',
  trustedOrigins: [
    process.env['NEXT_PUBLIC_APP_URL'] || process.env['CODER_APP_PREVIEW_URL'] || 'http://localhost:3000',
    'https://preview--solo-space--jxu002700.xuperson.org',
    'http://localhost:3000',
  ],
});

export type Session = typeof auth.$Infer.Session;
