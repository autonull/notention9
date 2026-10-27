import React from 'react';
import {cn} from '../../utils/ui';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    shape?: 'circle' | 'square';
    status?: 'online' | 'offline' | 'busy' | 'away';
    statusPosition?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
}

export function Avatar({
    src,
    alt,
    name,
    size = 'md',
    shape = 'circle',
    status,
    statusPosition = 'bottom-right',
    className = '',
    ...props
}: AvatarProps) {
    const sizeStyles = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const statusSizes = {
        xs: 'w-1.5 h-1.5',
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
        xl: 'w-4 h-4',
    };

    const statusColors = {
        online: 'bg-green-500',
        offline: 'bg-gray-500',
        busy: 'bg-red-500',
        away: 'bg-yellow-500',
    };

    const positionStyles = {
        'bottom-right': 'bottom-0 right-0',
        'top-right': 'top-0 right-0',
        'bottom-left': 'bottom-0 left-0',
        'top-left': 'top-0 left-0',
    };

    const initials = name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className={cn('relative inline-flex shrink-0', className)} {...props}>
            <div
                className={cn(
                    'overflow-hidden bg-gray-800 flex items-center justify-center text-white font-medium',
                    'border-2 border-gray-700',
                    sizeStyles[size],
                    shape === 'circle' ? 'rounded-full' : 'rounded-xl'
                )}
                aria-label={name || alt}
            >
                {src ? (
                    <img
                        src={src}
                        alt={alt || name || ''}
                        className="w-full h-full object-cover"
                    />
                ) : initials ? (
                    <span>{initials}</span>
                ) : (
                    <svg className="w-1/2 h-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                )}
            </div>
            {status && (
                <span
                    className={cn(
                        'absolute rounded-full border-2 border-gray-950',
                        statusSizes[size],
                        statusColors[status],
                        positionStyles[statusPosition]
                    )}
                    aria-label={`Status: ${status}`}
                />
            )}
        </div>
    );
}