import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils';

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