import React from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default';
    size?: 'sm' | 'md';
    pill?: boolean;
    icon?: React.ReactNode;
    dot?: boolean;
    dotColor?: string;
}

export function Badge({
    variant = 'default',
    size = 'md',
    pill = false,
    icon,
    dot,
    dotColor,
    className = '',
    children,
    ...props
}: BadgeProps) {
    const tokens = componentTokens.badge;

    return (
        <span
            className={cn(
                tokens.base,
                tokens.sizes[size],
                tokens.variants[variant],
                pill && tokens.pill,
                className
            )}
            {...props}
        >
            {dot && (
                <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor || 'currentColor' }}
                />
            )}
            {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
            {children}
        </span>
    );
}