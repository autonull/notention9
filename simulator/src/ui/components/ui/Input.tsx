import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = 'left',
      size = 'md',
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    const iconSizeStyles = {
      sm: DesignTokens.sizing.iconSm,
      md: DesignTokens.sizing.iconMd,
      lg: DesignTokens.sizing.iconLg,
    };

    const showIcon = icon && !error;

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className={cn(DesignTokens.typography.label, 'mb-1.5')}>
            {label}
          </label>
        )}
        <div className="relative">
          {showIcon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <span className={iconSizeStyles[size]}>{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            className={cn(
              'w-full rounded-lg text-white outline-none',
              DesignTokens.colors.input.base,
              DesignTokens.sizing.input[size],
              showIcon && iconPosition === 'left' && 'pl-10',
              showIcon && iconPosition === 'right' && 'pr-10',
              error ? DesignTokens.colors.input.error : DesignTokens.colors.input.default,
              className
            )}
            {...props}
          />
          {showIcon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              <span className={iconSizeStyles[size]}>{icon}</span>
            </div>
          )}
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" aria-hidden="true">
              <svg size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className={cn(DesignTokens.typography.error, 'mt-1.5', 'role-alert')} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className={cn(DesignTokens.typography.hint, 'mt-1.5')}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      fullWidth = true,
      rows = 4,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={textareaId} className={cn(DesignTokens.typography.label, 'mb-1.5')}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-lg text-white resize-y outline-none',
            DesignTokens.colors.input.base,
            DesignTokens.sizing.input[size],
            error ? DesignTokens.colors.input.error : DesignTokens.colors.input.default,
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className={cn(DesignTokens.typography.error, 'mt-1.5')} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className={cn(DesignTokens.typography.hint, 'mt-1.5')}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      size = 'md',
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={selectId} className={cn(DesignTokens.typography.label, 'mb-1.5')}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            className={cn(
              'w-full rounded-lg text-white appearance-none outline-none',
              DesignTokens.colors.input.base,
              DesignTokens.sizing.input[size],
              'pr-10',
              error ? DesignTokens.colors.input.error : DesignTokens.colors.input.default,
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" aria-hidden="true">
              <svg size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className={cn(DesignTokens.typography.error, 'mt-1.5')} role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className={cn(DesignTokens.typography.hint, 'mt-1.5')}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';