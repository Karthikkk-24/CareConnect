'use client';

import { useMemo } from 'react';
import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useAuth } from '@clerk/nextjs';
import { getPublicApiUrl } from '@/lib/api-url';

const API_URL = getPublicApiUrl();

/**
 * Returns a memoized Apollo client wired to the current Clerk session.
 * The token is fetched lazily on every request so it stays fresh.
 */
export function useApolloClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useMemo(() => {
    const httpLink = new HttpLink({ uri: API_URL });

    const authLink = setContext(async (_, { headers }) => {
      if (!isLoaded || !isSignedIn) return { headers };
      const token = await getToken();
      return {
        headers: {
          ...headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      };
    });

    return new ApolloClient({
      link: from([authLink, httpLink]),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: { fetchPolicy: 'cache-and-network' },
      },
    });
  }, [getToken, isLoaded, isSignedIn]);
}
