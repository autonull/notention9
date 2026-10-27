import React, { HTMLAttributes, forwardRef } from 'react';
import { DesignTokens } from './DesignTokens';
import { cn } from '../../utils';

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => (
    <p ref={ref} className={cn(DesignTokens.typography.bodySm, DesignTokens.colors.text.muted, 'mt-1', className)} {...props}>
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';