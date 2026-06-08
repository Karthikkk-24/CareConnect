'use client';

import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { createClient } from '@/lib/supabase/client';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql',
});

const authLink = setContext(async (_, { headers }) => {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    headers: {
      ...headers,
      authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
