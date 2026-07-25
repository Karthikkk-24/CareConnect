'use client';

import { useQuery } from '@apollo/client';
import { ClayBadge } from '@careconnect/ui';
import { ME_QUERY } from '@/lib/graphql/queries';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { data } = useQuery(ME_QUERY);
  const user = data?.me;

  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-clay-text">{title}</h1>
        {subtitle ? <p className="text-sm text-clay-text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-clay-surface px-4 py-2 shadow-clay-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-primary-light text-sm font-bold text-clay-primary">
            {user?.fullName?.charAt(0) ?? 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-clay-text">{user?.fullName ?? 'User'}</p>
            {user?.roles?.[0] ? (
              <ClayBadge variant="info">{user.roles[0].replace('_', ' ')}</ClayBadge>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
