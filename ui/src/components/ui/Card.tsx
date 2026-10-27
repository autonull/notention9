import React from 'react';
import {cn} from '../../utils/ui';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
    variant = 'default',
    hover = false,
    padding = 'md',
    className = '',
    children,
    ...props
}: CardProps) {
    const variantStyles: Record<string, string> = {
        default: 'card',
        elevated: 'card card-elevated',
        outlined: 'card',
        glass: 'card glass',
    };

    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4 md:p-6',
        lg: 'p-6 md:p-8',
    };

    const hoverClass = hover ? 'card-hover' : '';

    return (
        <div
            className={cn(
                variantStyles[variant],
                paddingStyles[padding],
                hoverClass,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}