import React from 'react';
import {cn} from '../../utils/ui';

export interface StatItemProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
    className?: string;
}

export function StatItem({
    label,
    value,
    icon,
    trend = 'neutral',
    trendValue,
    variant = 'default',
    className,
}: StatItemProps) {
    const variantColors = {
        default: 'text-gray-300',
        primary: 'text-blue-400',
        success: 'text-green-400',
        warning: 'text-yellow-400',
        danger: 'text-red-400',
    };

    const trendIcons = {
        up: '↑',
        down: '↓',
        neutral: '—',
    };

    const trendColors = {
        up: 'text-green-400',
        down: 'text-red-400',
        neutral: 'text-gray-500',
    };

    return (
        <div className={cn('bg-gray-800/50 rounded-xl p-4 border border-gray-700', className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                    <p className={cn('text-2xl font-bold mt-1', variantColors[variant])}>
                        {value}
                    </p>
                    {trendValue && (
                        <p className={cn('text-xs mt-1 flex items-center gap-1', trendColors[trend])}>
                            <span>{trendIcons[trend]}</span>
                            <span>{trendValue}</span>
                        </p>
                    )}
                </div>
                {icon && <div className="text-gray-500">{icon}</div>}
            </div>
        </div>
    );
}