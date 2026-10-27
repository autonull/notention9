import React from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
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
    const tokens = componentTokens.card;

    return (
        <div
            className={cn(
                tokens.base,
                tokens.variants[variant],
                tokens.padding[padding],
                hover && tokens.hover,
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}