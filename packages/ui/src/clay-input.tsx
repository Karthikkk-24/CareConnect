import type { InputHTMLAttributes } from 'react';
import { cn } from './utils';

interface ClayInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function ClayInput({ label, error, className, id, ...props }: ClayInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-clay-text">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          'w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-clay-text',
          'shadow-clay-inset outline-none transition-all duration-200',
          'placeholder:text-clay-text-muted focus-visible:ring-2 focus-visible:ring-clay-primary/30',
          error && 'ring-2 ring-clay-error/40',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-clay-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
