import React from 'react';
import { cn } from '../../utils/ui';
import { componentTokens, colors } from '../../styles/tokens';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
    const tokens = componentTokens.avatar;

    const statusColors = {
        online: colors.status.online,
        offline: colors.status.offline,
        busy: colors.status.busy,
        away: colors.status.away,
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
                    tokens.sizes[size],
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                )}
            </div>
            {status && (
                <span
                    className={cn(
                        'absolute rounded-full border-2 border-gray-950',
                        tokens.statusSizes[size],
                        statusColors[status],
                        positionStyles[statusPosition]
                    )}
                    aria-label={`Status: ${status}`}
                />
            )}
        </div>
    );
}