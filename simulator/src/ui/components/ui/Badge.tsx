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

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  size?: 'sm' | 'md' | 'lg';
}

export const Kbd = forwardRef<HTMLElement, KbdProps>(
  ({ size = 'md', className = '', children, ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-1.5 py-0.5 text-[10px]',
      md: 'px-2 py-0.5 text-xs',
      lg: 'px-2.5 py-1 text-sm',
    };

    return (
      <kbd
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-mono',
          'bg-gray-700 border border-gray-600 rounded',
          'text-gray-200 whitespace-nowrap',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </kbd>
    );
  }
);

Kbd.displayName = 'Kbd';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'rectangular', width, height, lines = 1, className = '', ...props }, ref) => {
    const baseStyles = cn('animate-pulse bg-gray-800 rounded');

    if (variant === 'text') {
      return (
        <div ref={ref} className={className} {...props}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(baseStyles, 'h-4', i === lines - 1 ? 'w-3/4' : 'w-full', 'mb-2')}
              style={{ width: i === lines - 1 && width ? width : undefined }}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, className)}
        style={{
          width: width || '100%',
          height: height || (variant === 'circular' ? '100%' : '100%'),
          borderRadius: variant === 'circular' ? '50%' : '0.5rem',
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', shape = 'circle', className = '', ...props }, ref) => {
    const sizeStyles = {
      xs: 'size-6 text-[10px]',
      sm: 'size-8 text-xs',
      md: 'size-10 text-sm',
      lg: 'size-12 text-base',
      xl: 'size-16 text-lg',
    };

    const shapeStyles = {
      circle: 'rounded-full',
      square: 'rounded-xl',
    };

    const [error, setError] = React.useState(false);

    if (src && !error) {
      return (
        <div
          ref={ref}
          className={cn(sizeStyles[size], shapeStyles[shape], 'overflow-hidden bg-gray-700', className)}
          {...props}
        >
          <img
            src={src}
            alt={alt || ''}
            onError={() => setError(true)}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(sizeStyles[size], shapeStyles[shape], 'bg-gray-700 flex items-center justify-center text-gray-500', className)}
        {...props}
      >
        {fallback || (
          <svg className="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';