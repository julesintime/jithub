import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? window.location.origin
    : process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
  plugins: [organizationClient()],
});

export const signIn = () => {
  return authClient.signIn.social({
    provider: 'keycloak',
    callbackURL: '/onboarding',
  });
};

export const signOut = () => {
  return authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = '/';
      },
    },
  });
};

export const useSession = authClient.useSession;
