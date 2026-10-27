import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

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