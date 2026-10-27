import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    const paddingStyles = {
      none: '',
      sm: DesignTokens.spacing.cardSm,
      md: DesignTokens.spacing.card,
      lg: 'p-6 lg:p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(DesignTokens.card[variant], 'rounded-2xl', paddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';