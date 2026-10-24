import React, {useEffect, useState, useRef} from 'react';
import {CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon, LoaderIcon} from '../common/icons';

interface ToastAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
}

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose: () => void;
    actions?: ToastAction[];
    persistent?: boolean;
    progress?: boolean;
}

export function Toast({message, type, duration = 3000, onClose, actions, persistent = false, progress = true}: ToastProps) {
    const [progressValue, setProgressValue] = useState(100);
    const [hovered, setHovered] = useState(false);
    const startTimeRef = useRef(Date.now());
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (persistent || duration <= 0) return;
        
        startTimeRef.current = Date.now();
        setProgressValue(100);
        
        const animate = () => {
            if (hovered) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgressValue(newProgress);
            
            if (newProgress > 0) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                onClose();
            }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameRef.current!);
    }, [duration, onClose, persistent, hovered]);

    useEffect(() => {
        if (persistent || duration <= 0) return;
        const timer = setTimeout(() => onClose(), duration);
        return () => clearTimeout(timer);
    }, [duration, onClose, persistent]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
            case 'error':
                return <XCircleIcon className="h-5 w-5 text-red-400" />;
            case 'warning':
                return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
            case 'info':
            default:
                return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-green-900/30 border-green-500/30 text-green-100';
            case 'error':
                return 'bg-red-900/30 border-red-500/30 text-red-100';
            case 'warning':
                return 'bg-yellow-900/30 border-yellow-500/30 text-yellow-100';
            case 'info':
            default:
                return 'bg-blue-900/30 border-blue-500/30 text-blue-100';
        }
    };

    const iconColors = {
        success: 'text-green-400',
        error: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
    }[type];

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`
        pointer-events-auto flex items-start gap-3 p-3 rounded-xl shadow-xl border animate-slide-in-right max-w-sm transition-all duration-200
        ${getStyles()}
        ${hovered ? 'shadow-2xl ring-1 ring-white/10' : ''}
      `}
            role="alert"
            aria-live={type === 'error' ? 'assertive' : 'polite'}
        >
            <div className={`flex-shrink-0 mt-0.5 ${iconColors}`}>{getIcon()}</div>
            <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-medium break-words">{message}</p>
                {actions && actions.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {actions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    action.onClick();
                                    if (!action.variant || action.variant !== 'ghost') {
                                        onClose();
                                    }
                                }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-target-48 ${
                                    action.variant === 'primary' 
                                        ? 'bg-white text-gray-900 hover:bg-gray-200' 
                                        : action.variant === 'secondary'
                                        ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
                                        : 'text-white/80 hover:text-white underline'
                                }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors touch-target"
                aria-label="Dismiss"
            >
                <XMarkIcon className="h-4 w-4"/>
            </button>
            {(progress && !persistent) && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-100 ease-linear"
                    style={{width: `${progressValue}%`}}
                    aria-hidden="true"
                />
            )}
            {persistent && progress && (
                <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-pulse-subtle" aria-hidden="true" />
            )}
        </div>
    );
};

// Helper for creating common toast patterns
export const toastTemplates = {
    success: (message: string, options?: Partial<ToastProps>) => ({ type: 'success' as const, message, ...options }),
    error: (message: string, options?: Partial<ToastProps>) => ({ type: 'error' as const, message, ...options }),
    info: (message: string, options?: Partial<ToastProps>) => ({ type: 'info' as const, message, ...options }),
    warning: (message: string, options?: Partial<ToastProps>) => ({ type: 'warning' as const, message, ...options }),
    
    saved: (item = 'Changes') => ({ 
        type: 'success' as const, 
        message: `${item} saved`, 
        duration: 2000 
    }),
    deleted: (item = 'Item') => ({ 
        type: 'success' as const, 
        message: `${item} deleted`, 
        duration: 2000 
    }),
    copied: (item = 'Content') => ({ 
        type: 'info' as const, 
        message: `${item} copied to clipboard`, 
        duration: 2000 
    }),
    networkError: () => ({ 
        type: 'error' as const, 
        message: 'Network error. Please check your connection.', 
        persistent: true,
        actions: [{ label: 'Retry', onClick: () => window.location.reload(), variant: 'primary' as const }]
    }),
    unsavedChanges: () => ({ 
        type: 'warning' as const, 
        message: 'You have unsaved changes', 
        persistent: true,
        actions: [
            { label: 'Save', onClick: () => window.dispatchEvent(new CustomEvent('save-note')), variant: 'primary' as const },
            { label: 'Discard', onClick: () => {}, variant: 'ghost' as const }
        ]
    }),
};
