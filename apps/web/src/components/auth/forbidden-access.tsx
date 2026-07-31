'use client';

import Link from 'next/link';
import { ClayButton, ClayCard } from '@careconnect/ui';

export function ForbiddenAccess({
  title = 'Access denied',
  message = 'You do not have permission to view this page.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ClayCard className="max-w-md space-y-4 p-8 text-center">
        <h1 className="text-xl font-bold text-clay-text">{title}</h1>
        <p className="text-sm text-clay-text-muted">{message}</p>
        <Link href="/dashboard">
          <ClayButton>Back to dashboard</ClayButton>
        </Link>
      </ClayCard>
    </div>
  );
}
