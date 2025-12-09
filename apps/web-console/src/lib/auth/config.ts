import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { keycloak } from 'better-auth/plugins/generic-oauth';

export const auth = betterAuth({
  database: {
    provider: 'sqlite',
    url: process.env['DATABASE_URL'] || 'file:./local.db',
  },
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
