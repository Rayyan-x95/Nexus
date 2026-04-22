import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, containerClassName, id, ...props },
  ref,
) {
  const inputId = id ?? `titan-input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <label htmlFor={inputId} className={cn('ui-input-wrap', containerClassName)}>
      <input
        ref={ref}
        id={inputId}
        className={cn('ui-input peer tracking-[0.01em]', error && 'ui-input-error', className)}
        placeholder=" "
        {...props}
      />
      <span className="ui-input-label">{label}</span>
      {error ? <span className="ui-input-hint">{error}</span> : null}
    </label>
  );
});
