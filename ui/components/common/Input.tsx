import React, { forwardRef } from 'react';
import { UI_STYLES } from '../../utils/ui';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  className = '',
  leftIcon,
  rightIcon,
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={UI_STYLES.input.label}>
          {label}
        </label>
      )}
      <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
                ${UI_STYLES.input.base}
                ${UI_STYLES.input.padding}
                ${leftIcon ? 'pl-10' : ''}
                ${rightIcon ? 'pr-10' : ''}
                ${error ? UI_STYLES.input.error : ''}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {rightIcon}
            </div>
          )}
      </div>
      {error && (
        <p className={UI_STYLES.input.errorText}>{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
