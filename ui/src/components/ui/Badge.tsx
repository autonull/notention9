import React from 'react';
import {cn} from '../../utils/ui';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
    size?: 'sm' | 'md';
    pill?: boolean;
    icon?: React.ReactNode;
    dot?: boolean;
    dotColor?: string;
}

export function Badge({
    variant = 'gray',
    size = 'md',
    pill = false,
    icon,
    dot,
    dotColor,
    className = '',
    children,
    ...props
}: BadgeProps) {
    const variantClassMap: Record<string, string> = {
        primary: 'badge-primary',
        success: 'badge-success',
        warning: 'badge-warning',
        danger: 'badge-danger',
        info: 'badge-info',
        purple: 'badge-purple',
        gray: 'badge-gray',
    };
    const variantClass = variantClassMap[variant];
    const sizeClass = size === 'sm' ? 'badge-sm' : '';

    return (
        <span
            className={cn(
                'badge',
                variantClass,
                sizeClass,
                pill && 'px-3',
                className
            )}
            {...props}
        >
            {dot && (
                <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{backgroundColor: dotColor || 'currentColor'}}
                />
            )}
            {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
            {children}
        </span>
    );
}