import React, { ReactNode } from 'react';
import { Button } from './Button';

export interface DropdownTriggerProps {
  children: ReactNode;
  'aria-label'?: string;
}

export const DropdownTrigger = ({ children, 'aria-label': ariaLabel, ...props }: DropdownTriggerProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <Button variant="ghost" size="sm" {...props} aria-label={ariaLabel}>
    {children}
  </Button>
);

DropdownTrigger.displayName = 'DropdownTrigger';