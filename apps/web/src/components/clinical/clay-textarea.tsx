import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@careconnect/ui';

interface ClayTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function ClayTextarea({ label, error, className, id, ...props }: ClayTextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex w-full flex-col gap-2">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-clay-text">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded-2xl border border-white/60 bg-clay-surface px-4 py-3 text-clay-text',
          'shadow-clay-inset outline-none transition-all duration-200',
          'placeholder:text-clay-text-muted focus:ring-2 focus:ring-clay-primary/30',
          error && 'ring-2 ring-clay-error/40',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-clay-error">{error}</p> : null}
    </div>
  );
}
