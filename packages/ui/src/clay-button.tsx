import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ClayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-clay-primary-light to-clay-primary text-white shadow-clay-sm hover:from-clay-primary hover:to-clay-primary-dark',
  secondary:
    'bg-clay-surface text-clay-primary shadow-clay-sm hover:shadow-clay border border-white/60',
  ghost: 'bg-transparent text-clay-primary hover:bg-clay-primary-light/50 shadow-none',
  danger:
    'bg-gradient-to-br from-red-400 to-clay-error text-white shadow-clay-sm hover:from-red-500 hover:to-red-600',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

export function ClayButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  isLoading,
  disabled,
  ...props
}: ClayButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : null}
      {children}
    </button>
  );
}
