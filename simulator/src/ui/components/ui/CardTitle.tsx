import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => (
    <h3 ref={ref} className={cn(DesignTokens.typography.heading4, className)} {...props}>
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';