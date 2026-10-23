import React from 'react';
import {cn} from '../../utils/ui';

interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    iconClassName?: string;
    variant?: 'default' | 'card' | 'minimal';
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = '',
    iconClassName = 'h-12 w-12',
    variant = 'default'
}: EmptyStateProps) {
    const variantStyles = {
        default: 'flex flex-col items-center justify-center py-12 px-4 text-center',
        card: 'empty-state p-8',
        minimal: 'flex flex-col items-center justify-center py-6 px-4 text-center',
    };

    return (
        <div className={cn(variantStyles[variant], className)}>
            {Icon && (
                <div className={cn(
                    'flex items-center justify-center rounded-full mb-4',
                    variant === 'card' ? 'empty-state-icon' : 'bg-gray-800 p-4'
                )}>
                    <Icon className={iconClassName}/>
                </div>
            )}
            <h3 className={cn(
                'font-medium',
                variant === 'card' ? 'empty-state-title text-lg' : 'text-gray-300 text-lg mb-2'
            )}>
                {title}
            </h3>
            {description && (
                <div className={cn(
                    'text-sm max-w-xs',
                    variant === 'card' ? 'empty-state-description text-gray-500' : 'text-gray-500 mb-6'
                )}>
                    {description}
                </div>
            )}
            {action}
        </div>
    );
};