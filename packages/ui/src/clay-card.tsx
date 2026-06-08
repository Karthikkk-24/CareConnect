import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

interface ClayCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  inset?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function ClayCard({
  children,
  inset = false,
  padding = 'md',
  className,
  ...props
}: ClayCardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-clay-surface border border-white/60',
        inset ? 'shadow-clay-inset' : 'shadow-clay',
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
