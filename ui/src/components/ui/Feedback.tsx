import React from 'react';
import {cn} from '../../utils/ui';
import {LoadingSpinner} from '../common/icons';

export interface LoadingStateProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    label?: string;
    description?: string;
    className?: string;
    overlay?: boolean;
    fullScreen?: boolean;
}

export function LoadingState({
    size = 'md',
    label,
    description,
    className = '',
    overlay = false,
    fullScreen = false,
}: LoadingStateProps) {
    const sizeStyles = {
        sm: 'h-6 w-6',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
    };

    const containerStyles = fullScreen
        ? 'fixed inset-0 z-[500] flex-center bg-gray-950/95 backdrop-blur-sm'
        : overlay
        ? 'absolute inset-0 flex-center bg-gray-950/80 backdrop-blur-sm'
        : 'flex flex-col items-center justify-center';

    return (
        <div className={cn(containerStyles, className)} role="status" aria-live="polite" aria-label={label || 'Loading'}>
            <LoadingSpinner className={cn(sizeStyles[size], 'text-blue-500')} />
            {label && (
                <div className="mt-4 text-center">
                    <p className="text-lg font-medium text-white">{label}</p>
                    {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
                </div>
            )}
        </div>
    );
}

export interface SkeletonProps {
    variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'note' | 'avatar' | 'list-item' | 'dashboard-stat' | 'activity-item';
    width?: string | number;
    height?: string | number;
    className?: string;
    count?: number;
}

export function Skeleton({
    variant = 'rectangular',
    width = '100%',
    height,
    className = '',
    count = 1,
}: SkeletonProps) {
    const baseStyles = 'animate-pulse bg-gray-800 rounded';

    const variantStyles = {
        text: 'h-4 rounded-full',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
        card: 'rounded-xl',
        note: 'rounded-xl bg-gray-800/50',
        avatar: 'rounded-full',
        'list-item': 'rounded-lg bg-gray-800/50',
        'dashboard-stat': 'rounded-xl bg-gray-800/50',
        'activity-item': 'rounded-lg bg-gray-800/50',
    };

    // Pre-defined skeleton templates for common UI patterns
    if (variant === 'note') {
        return (
            <div className={cn('animate-pulse space-y-3 p-4 bg-gray-900/50 rounded-xl border border-gray-700/30', className)}>
                <div className="h-6 w-3/4 bg-gray-800 rounded" />
                <div className="h-4 w-1/2 bg-gray-800 rounded" />
                <div className="h-4 w-5/6 bg-gray-800 rounded" />
                <div className="flex gap-2 mt-4">
                    <div className="h-5 w-16 bg-gray-800 rounded-full" />
                    <div className="h-5 w-20 bg-gray-800 rounded-full" />
                </div>
            </div>
        );
    }

    if (variant === 'list-item') {
        return (
            <div className={cn('animate-pulse p-3 bg-gray-900/50 rounded-lg border border-gray-700/30 space-y-2', className)}>
                <div className="flex items-center justify-between">
                    <div className="h-5 w-2/5 bg-gray-800 rounded" />
                    <div className="h-4 w-12 bg-gray-800 rounded-full" />
                </div>
                <div className="h-3 w-3/5 bg-gray-800 rounded" />
                <div className="flex gap-2">
                    <div className="h-4 w-14 bg-gray-800 rounded-full" />
                    <div className="h-4 w-14 bg-gray-800 rounded-full" />
                </div>
            </div>
        );
    }

    if (variant === 'dashboard-stat') {
        return (
            <div className={cn('animate-pulse p-6 bg-gray-900/50 rounded-2xl border border-gray-700/30 space-y-3', className)}>
                <div className="flex items-center justify-between">
                    <div className="h-4 w-1/3 bg-gray-800 rounded" />
                    <div className="h-10 w-10 bg-gray-800 rounded-xl" />
                </div>
                <div className="h-8 w-1/4 bg-gray-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-800 rounded" />
            </div>
        );
    }

    if (variant === 'activity-item') {
        return (
            <div className={cn('animate-pulse flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30', className)}>
                <div className="h-10 w-10 bg-gray-800 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 w-1/2 bg-gray-800 rounded" />
                    <div className="h-3 w-3/4 bg-gray-800 rounded" />
                    <div className="h-3 w-1/3 bg-gray-800 rounded" />
                </div>
            </div>
        );
    }

    const items = Array.from({length: count}, (_, i) => (
        <div
            key={i}
            className={cn(baseStyles, variantStyles[variant], className)}
            style={{width, height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? width : variant === 'avatar' ? width : undefined)}}
            aria-hidden="true"
        />
    ));

    return count > 1 ? <div className="space-y-3">{items}</div> : items[0];
}

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    className?: string;
    illustration?: React.ReactNode;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    secondaryAction,
    className = '',
    illustration,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center py-12 md:py-16 px-4',
                'bg-gray-900/50 rounded-2xl border border-gray-700/30',
                className
            )}
        >
            {illustration ? (
                <div className="mb-6 text-gray-500">{illustration}</div>
            ) : icon ? (
                <div className="mb-6 text-gray-500 flex-shrink-0">
                    {typeof icon === 'object' && 'type' in icon
                        ? React.cloneElement(icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, {className: 'w-16 h-16'})
                        : icon}
                </div>
            ) : null}
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            {description && <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">{description}</p>}
            {(action || secondaryAction) && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
                    {action && <div className="w-full sm:w-auto">{action}</div>}
                    {secondaryAction && <div className="w-full sm:w-auto">{secondaryAction}</div>}
                </div>
            )}
        </div>
    );
}

export interface ErrorStateProps {
    title?: string;
    message: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    className?: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}

export function ErrorState({
    title = 'Something went wrong',
    message,
    icon,
    action,
    secondaryAction,
    className = '',
    dismissible = false,
    onDismiss,
}: ErrorStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center py-12 md:py-16 px-4',
                'bg-red-900/20 border border-red-900/50 rounded-2xl',
                className
            )}
            role="alert"
        >
            <div className="relative mb-6">
                {icon ? (
                    <div className="text-red-400 flex-shrink-0">
                        {typeof icon === 'object' && 'type' in icon
                            ? React.cloneElement(icon as React.ReactElement<React.SVGProps<SVGSVGElement>>, {className: 'w-16 h-16'})
                            : icon}
                    </div>
                ) : (
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-900/50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                        </svg>
                    </div>
                )}
                {dismissible && onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="absolute -top-2 -right-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-full transition-colors"
                        aria-label="Dismiss error"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                )}
            </div>
            <h3 className="text-lg font-semibold text-red-100 mb-2">{title}</h3>
            <p className="text-sm text-red-300 max-w-sm mx-auto mb-6">{message}</p>
            {(action || secondaryAction) && (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
                    {action && <div className="w-full sm:w-auto">{action}</div>}
                    {secondaryAction && <div className="w-full sm:w-auto">{secondaryAction}</div>}
                </div>
            )}
        </div>
    );
}

export interface InlineAlertProps {
    type: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message: string;
    action?: React.ReactNode;
    dismissible?: boolean;
    onDismiss?: () => void;
    className?: string;
}

export function InlineAlert({
    type,
    title,
    message,
    action,
    dismissible = false,
    onDismiss,
    className = '',
}: InlineAlertProps) {
    const typeStyles = {
        info: 'bg-blue-900/30 border-blue-800/50 text-blue-100',
        success: 'bg-green-900/30 border-green-800/50 text-green-100',
        warning: 'bg-yellow-900/30 border-yellow-800/50 text-yellow-100',
        error: 'bg-red-900/30 border-red-800/50 text-red-100',
    };

    const icons = {
        info: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        ),
        success: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
        ),
    };

    return (
        <div
            className={cn(
                'flex gap-3 p-4 rounded-xl border',
                'animate-slide-in-down',
                typeStyles[type],
                className
            )}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
            <div className="flex-1 min-w-0">
                {title && <p className="font-medium text-sm">{title}</p>}
                <p className={cn('text-sm', title ? 'mt-1' : '')}>{message}</p>
            </div>
            {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
            {dismissible && onDismiss && (
                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            )}
        </div>
    );
}

export interface ProgressProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    label?: string;
    variant?: 'default' | 'brand' | 'success' | 'warning' | 'error';
    className?: string;
    animated?: boolean;
}

export function Progress({
    value,
    max = 100,
    size = 'md',
    showLabel = false,
    label,
    variant = 'default',
    className = '',
    animated = false,
}: ProgressProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeStyles = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    const variantStyles = {
        default: 'bg-blue-500',
        brand: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500',
    };

    return (
        <div className={cn('w-full', className)}>
            {(showLabel || label) && (
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-300">{label || `${Math.round(percentage)}%`}</span>
                    {showLabel && <span className="text-sm text-gray-500 font-mono">{Math.round(percentage)}%</span>}
                </div>
            )}
            <div className={cn('w-full bg-gray-800 rounded-full overflow-hidden', sizeStyles[size])}>
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-300 ease-out',
                        variantStyles[variant],
                        animated && 'animate-pulse-subtle'
                    )}
                    style={{width: `${percentage}%`}}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-label={label}
                />
            </div>
        </div>
    );
}

export interface SpinnerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    label?: string;
}

export function Spinner({size = 'md', className = '', label}: SpinnerProps) {
    const sizeStyles = {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
    };

    return (
        <div className={cn('flex items-center justify-center', className)} aria-label={label || 'Loading'} role="status">
            <LoadingSpinner className={cn(sizeStyles[size], 'text-blue-500', className)} />
            {label && <span className="sr-only">{label}</span>}
        </div>
    );
}