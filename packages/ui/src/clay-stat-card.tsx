import type { ReactNode } from 'react';
import { ClayCard } from './clay-card';
import { cn } from './utils';

interface ClayStatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function ClayStatCard({ title, value, icon, trend, className }: ClayStatCardProps) {
  return (
    <ClayCard className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-clay-text-muted">{title}</span>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-clay-primary-light text-clay-primary shadow-clay-inset">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-clay-text">{value}</span>
        {trend ? (
          <span
            className={cn(
              'text-sm font-medium',
              trend.positive ? 'text-clay-success' : 'text-clay-error',
            )}
          >
            {trend.value}
          </span>
        ) : null}
      </div>
    </ClayCard>
  );
}
