'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { ClayButton, ClayCard } from '@careconnect/ui';
import { ME_QUERY } from '@/lib/graphql/queries';

export function ForbiddenAccess({
  title = 'Access denied',
  message = 'You do not have permission to view this page.',
  homeHref,
}: {
  title?: string;
  message?: string;
  homeHref?: string;
}) {
  const { data } = useQuery(ME_QUERY, { errorPolicy: 'ignore' });
  const roles: string[] = data?.me?.roles ?? [];
  const href =
    homeHref ??
    (roles.includes('patient') ? '/portal' : '/dashboard');
  const label = roles.includes('patient') ? 'Back to portal' : 'Back to dashboard';

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ClayCard className="max-w-md space-y-4 p-8 text-center">
        <h1 className="text-xl font-bold text-clay-text">{title}</h1>
        <p className="text-sm text-clay-text-muted">{message}</p>
        <Link href={href}>
          <ClayButton>{homeHref === '/login' ? 'Sign in' : label}</ClayButton>
        </Link>
      </ClayCard>
    </div>
  );
}
