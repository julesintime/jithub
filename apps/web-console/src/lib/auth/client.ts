import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000',
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
