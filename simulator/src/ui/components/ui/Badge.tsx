import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, className = '', children, ...props }, ref) => {
    const variantStyles = {
      default: DesignTokens.colors.badge.default,
      primary: DesignTokens.colors.badge.primary,
      success: DesignTokens.colors.badge.success,
      warning: DesignTokens.colors.badge.warning,
      error: DesignTokens.colors.badge.error,
      info: DesignTokens.colors.badge.info,
    };

    const sizeStyles = {
      sm: 'px-1.5 py-0.5 text-[10px]',
      md: 'px-2 py-0.5 text-xs',
      lg: 'px-2.5 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium rounded-full border',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';