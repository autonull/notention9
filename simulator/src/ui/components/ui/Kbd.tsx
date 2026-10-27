import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

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