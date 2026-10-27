import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-4 border-t', DesignTokens.colors.border.primary, 'flex items-center gap-4', className)} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';