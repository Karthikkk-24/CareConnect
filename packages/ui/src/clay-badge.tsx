import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface ClayBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-clay-primary-light text-clay-primary',
  success: 'bg-green-100 text-clay-success',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-clay-error',
  info: 'bg-blue-100 text-clay-primary-dark',
};

export function ClayBadge({
  children,
  variant = 'default',
  className,
  ...props
}: ClayBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
