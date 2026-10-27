import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';