import React from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface ToastProps {
    id: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    onClose: (id: string) => void;
    action?: { label: string; onClick: () => void };
    /** If true, toast won't auto-dismiss */
    persistent?: boolean;
    /** Custom title for the toast */
    title?: string;
}

export function Toast({ id, message, type = 'info', duration = 4000, onClose, action, persistent = false, title }: ToastProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const [progress, setProgress] = React.useState(100);

    React.useEffect(() => {
        if (persistent) return;

        const startTime = Date.now();
        const endTime = startTime + duration;

        const animateProgress = () => {
            const now = Date.now();
            const remaining = Math.max(0, endTime - now);
            const progressPercent = (remaining / duration) * 100;
            setProgress(progressPercent);

            if (remaining > 0 && !isHovered) {
                requestAnimationFrame(animateProgress);
            } else if (remaining <= 0) {
                onClose(id);
            }
        };

        const timer = setTimeout(() => {
            if (!isHovered) onClose(id);
        }, duration);

        if (!isHovered) {
            requestAnimationFrame(animateProgress);
        }

        return () => clearTimeout(timer);
    }, [id, duration, onClose, persistent, isHovered]);

    const tokens = componentTokens.toast;
    const progressColors = tokens.progress;
    const buttonTokens = componentTokens.button;

    const icons = {
        info: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        success: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    return (
        <div
            className={cn(
                tokens.base,
                tokens.types[type]
            )}
            role="alert"
            aria-live={persistent ? 'assertive' : 'polite'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Progress bar for auto-dismiss */}
            {!persistent && duration > 0 && (
                <div
                    className="absolute bottom-0 left-0 h-1 transition-all duration-100"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: progressColors[type]
                    }}
                />
            )}

            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
            <div className="flex-1 min-w-0">
                {title && (
                    <p className="text-sm font-semibold mb-1">{title}</p>
                )}
                <p className="text-sm font-medium">{message}</p>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className={cn(
                        buttonTokens.base,
                        buttonTokens.sizes.sm,
                        buttonTokens.variants.ghost,
                        'flex-shrink-0'
                    )}
                >
                    {action.label}
                </button>
            )}
            <button
                onClick={() => onClose(id)}
                className={cn(
                    buttonTokens.base,
                    buttonTokens.sizes.xs,
                    buttonTokens.variants.ghost,
                    'flex-shrink-0'
                )}
                aria-label="Dismiss"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export interface ToastContainerProps {
    toasts: Array<{ id: string; message: string; type?: 'info' | 'success' | 'warning' | 'error'; duration?: number; action?: { label: string; onClick: () => void }; persistent?: boolean; title?: string }>;
    onClose: (id: string) => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    /** Maximum number of toasts to show at once */
    maxToasts?: number;
    /** Gap between toasts */
    gap?: number;
}

export function ToastContainer({ toasts, onClose, position = 'top-right', maxToasts = 5, gap = 8 }: ToastContainerProps) {
    const positionStyles = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    const visibleToasts = toasts.slice(-maxToasts);

    return (
        <div
            className={cn(
                'fixed z-[600] flex flex-col pointer-events-none',
                positionStyles[position]
            )}
            style={{ gap: `${gap}px` }}
            aria-live="polite"
            aria-atomic="true"
        >
            {visibleToasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
                    <Toast {...toast} onClose={onClose} />
                </div>
            ))}
        </div>
    );
}