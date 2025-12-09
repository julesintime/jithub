import { betterAuth } from 'better-auth';
import { genericOAuth, keycloak } from 'better-auth/plugins';

export const auth = betterAuth({
  database: {
    provider: 'postgres',
    url: process.env['DATABASE_URL'] || '',
  },
  socialProviders: {
    keycloak: {
      clientId: process.env['KEYCLOAK_CLIENT_ID'] || '',
      clientSecret: process.env['KEYCLOAK_CLIENT_SECRET'] || '',
      issuer:
        `${process.env['KEYCLOAK_BASE_URL']}/realms/${process.env['KEYCLOAK_REALM']}` ||
        '',
    },
  },
  plugins: [
    genericOAuth({
      config: [
        keycloak({
          clientId: process.env['KEYCLOAK_CLIENT_ID'] || '',
          clientSecret: process.env['KEYCLOAK_CLIENT_SECRET'] || '',
          issuer:
            `${process.env['KEYCLOAK_BASE_URL']}/realms/${process.env['KEYCLOAK_REALM']}` ||
            '',
        }),
      ],
    }),
  ],
  advanced: {
    generateId: () => {
      // Generate custom ID for users
      return crypto.randomUUID();
    },
  },
});

export type Session = typeof auth.$Infer.Session;
