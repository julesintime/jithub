import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: {
    provider: 'sqlite',
    url: process.env['DATABASE_URL'] || 'file:./local.db',
  },
  socialProviders: {
    // Keycloak as generic OIDC provider
    github: {
      clientId: process.env['KEYCLOAK_CLIENT_ID'] || '',
      clientSecret: process.env['KEYCLOAK_CLIENT_SECRET'] || '',
      // We'll use github as placeholder for generic OIDC
      // This needs proper OIDC plugin configuration
      enabled: false,
    },
  },
  baseURL: process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
  trustedOrigins: [process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'],
});

export type Session = typeof auth.$Infer.Session;
