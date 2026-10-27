import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
  children: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'md', 'aria-label': ariaLabel, children, className = '', ...props }, ref) => {
    const sizeStyles = {
      sm: DesignTokens.sizing.iconButton.sm,
      md: DesignTokens.sizing.iconButton.md,
      lg: DesignTokens.sizing.iconButton.lg,
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors',
          'touch-target',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';