'use client';

import { ClayButton } from '@careconnect/ui';

export function QueryError({
  message = 'We could not load this data. Please try again.',
  onRetry,
  className = '',
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`space-y-3 text-center ${className}`.trim()}>
      <p className="text-sm text-clay-error">{message}</p>
      {onRetry ? (
        <ClayButton type="button" size="sm" onClick={onRetry}>
          Try again
        </ClayButton>
      ) : null}
    </div>
  );
}
