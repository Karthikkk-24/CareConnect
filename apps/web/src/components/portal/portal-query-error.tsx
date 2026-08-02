'use client';

import { ClayButton, ClayCard } from '@careconnect/ui';

export function PortalQueryError({
  message = 'We could not load your health records. Please try again.',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <ClayCard className="max-w-lg space-y-4 p-6 text-center">
      <p className="text-sm text-clay-error">{message}</p>
      <ClayButton type="button" onClick={onRetry}>
        Try again
      </ClayButton>
    </ClayCard>
  );
}
