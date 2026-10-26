import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center font-bold rounded-xl',
      DesignTokens.colors.state.transition,
      DesignTokens.colors.state.active,
      DesignTokens.colors.state.focus,
      DesignTokens.colors.state.disabled,
      DesignTokens.sizing.touchTarget,
      fullWidth && 'w-full'
    );

    const variantStyles = {
      primary: DesignTokens.colors.accent.primary,
      secondary: DesignTokens.colors.accent.secondary,
      danger: DesignTokens.colors.accent.danger,
      ghost: DesignTokens.colors.accent.ghost,
      outline: DesignTokens.colors.accent.outline,
    };

    const sizeStyles = {
      sm: DesignTokens.sizing.button.sm,
      md: DesignTokens.sizing.button.md,
      lg: DesignTokens.sizing.button.lg,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin" size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        ) : icon && iconPosition === 'left' ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        <span>{children}</span>
        {icon && iconPosition === 'right' && !loading && (
          <span className="flex-shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

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