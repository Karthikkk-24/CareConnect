'use client';

import { ApolloProvider } from '@apollo/client';
import { useApolloClient } from '@/lib/apollo-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const apolloClient = useApolloClient();
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
