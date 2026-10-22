import React from 'react';
import {cn} from '../../utils/ui';
import {Tooltip} from './Overlay';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = `
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-150 ease-out
        rounded-xl focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-blue-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-gray-950
        disabled:opacity-40 disabled:cursor-not-allowed
        select-none whitespace-nowrap
        ${fullWidth ? 'w-full' : ''}
    `;

    const variantStyles = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm shadow-blue-500/20 border border-transparent',
        secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700 active:bg-gray-600 border border-gray-700',
        ghost: 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-100 active:bg-gray-700 border border-transparent',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-500/20 border border-transparent',
        success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm shadow-green-500/20 border border-transparent',
        outline: 'bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-700',
    };

    const sizeStyles = {
        xs: 'px-2 py-1 text-[11px] gap-1',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
            ) : leftIcon ? (
                <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>
            ) : null}
            {children}
            {!loading && rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
        </button>
    );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ComponentType<{className?: string}>;
    isActive?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
    containerClassName?: string;
    label?: string;
}

export function IconButton({
    icon: Icon,
    isActive = false,
    variant = 'ghost',
    size = 'md',
    className = '',
    disabled,
    title,
    tooltip,
    tooltipPosition = 'top',
    containerClassName,
    label,
    ...props
}: IconButtonProps) {
    const baseClasses = 'rounded-lg transition-all duration-200 flex items-center justify-center';

    const sizeClasses = {
        xs: 'p-1',
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-2.5',
    };

    const getVariantClasses = () => {
        switch (variant) {
            case 'primary':
                return 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm';
            case 'secondary':
                return 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700';
            case 'success':
                return 'bg-transparent text-gray-400 hover:text-green-400 hover:bg-green-900/30';
            case 'danger':
                return 'bg-transparent text-gray-400 hover:text-red-400 hover:bg-red-900/30';
            case 'ghost':
            default:
                return isActive
                    ? 'bg-blue-900/40 text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800';
        }
    };

    const iconSizes = {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    const button = (
        <button
            className={cn(
                baseClasses,
                sizeClasses[size],
                getVariantClasses(),
                disabled && 'opacity-40 cursor-not-allowed',
                className
            )}
            disabled={disabled}
            title={tooltip ? undefined : title}
            aria-label={props['aria-label'] || title || tooltip}
            type="button"
            aria-pressed={isActive}
            {...props}
        >
            <Icon className={iconSizes[size]}/>
            {label && (
                <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {label}
                </span>
            )}
        </button>
    );

    if (tooltip) {
        return (
            <Tooltip content={tooltip} position={tooltipPosition} className={containerClassName}>
                {button}
            </Tooltip>
        );
    }

    return button;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
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
    const variantStyles = {
        default: 'bg-gray-900 border border-gray-700/50',
        elevated: 'bg-gray-900 border border-gray-700/50 shadow-xl shadow-black/20',
        outlined: 'bg-transparent border border-gray-700',
        glass: 'bg-gray-900/80 backdrop-blur-md border border-gray-700/30',
    };

    const paddingStyles = {
        none: '',
        sm: 'p-3',
        md: 'p-4 md:p-6',
        lg: 'p-6 md:p-8',
    };

    return (
        <div
            className={cn(
                'rounded-2xl transition-all duration-200',
                variantStyles[variant],
                paddingStyles[padding],
                hover && 'hover:border-gray-600 hover:shadow-lg hover:shadow-black/30',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

export function Input({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    fullWidth = true,
    className = '',
    id,
    ...props
}: InputProps) {
    const inputId = id || `input-${React.useId()}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
        <div className={cn('w-full', fullWidth && 'w-full')}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {leftIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={inputId}
                    className={cn(
                        'w-full bg-gray-950/50 border border-gray-700/50 rounded-xl',
                        'text-white placeholder-gray-600',
                        'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20',
                        'transition-all duration-150',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        leftIcon ? 'pl-10' : 'px-4',
                        rightIcon ? 'pr-10' : 'px-4',
                        'py-3 text-sm',
                        error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
                        className
                    )}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={cn(errorId, hintId)}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-sm text-red-400" role="alert">
                    {error}
                </p>
            )}
            {hint && !error && (
                <p id={hintId} className="mt-1.5 text-sm text-gray-500">
                    {hint}
                </p>
            )}
        </div>
    );
}

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
    const variantStyles = {
        primary: 'bg-blue-900/50 text-blue-300 border border-blue-800/50',
        success: 'bg-green-900/50 text-green-300 border border-green-800/50',
        warning: 'bg-yellow-900/50 text-yellow-300 border border-yellow-800/50',
        danger: 'bg-red-900/50 text-red-300 border border-red-800/50',
        info: 'bg-cyan-900/50 text-cyan-300 border border-cyan-800/50',
        purple: 'bg-purple-900/50 text-purple-300 border border-purple-800/50',
        gray: 'bg-gray-800 text-gray-300 border border-gray-700',
    };

    const sizeStyles = {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-xs',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 font-medium border',
                'rounded-full',
                variantStyles[variant],
                sizeStyles[size],
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

// Note: Tooltip is exported from Overlay to avoid duplicate exports
// export interface TooltipProps { ... }
// export function Tooltip() { ... }

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlayClick?: boolean;
    showCloseButton?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    closeOnOverlayClick = true,
    showCloseButton = true,
}: ModalProps) {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const previousActiveElement = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';
            contentRef.current?.focus();
        } else {
            document.body.style.overflow = '';
            previousActiveElement.current?.focus();
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'Tab') {
                const focusableElements = contentRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements?.length) {
                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeStyles = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-4xl',
    };

    return (
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
        >
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={contentRef}
                tabIndex={-1}
                className={cn(
                    'relative w-full bg-gray-900 rounded-2xl border border-gray-700',
                    'shadow-2xl animate-scale-in',
                    'overflow-hidden flex flex-col max-h-[90vh]',
                    sizeStyles[size]
                )}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 md:p-6 border-b border-gray-700">
                        <div>
                            {title && (
                                <h2 id="modal-title" className="text-lg font-semibold text-white">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p id="modal-description" className="mt-1 text-sm text-gray-400">
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

export interface ToastProps {
    id: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    onClose: (id: string) => void;
    action?: {label: string; onClick: () => void};
}

export function Toast({id, message, type = 'info', duration = 4000, onClose, action}: ToastProps) {
    React.useEffect(() => {
        const timer = setTimeout(() => onClose(id), duration);
        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const typeStyles = {
        info: 'bg-blue-900/50 border-blue-800/50 text-blue-100',
        success: 'bg-green-900/50 border-green-800/50 text-green-100',
        warning: 'bg-yellow-900/50 border-yellow-800/50 text-yellow-100',
        error: 'bg-red-900/50 border-red-800/50 text-red-100',
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
                'flex items-start gap-3 p-4 rounded-xl border shadow-lg',
                'animate-slide-in-up',
                typeStyles[type]
            )}
            role="alert"
            aria-live="polite"
        >
            <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{message}</p>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="flex-shrink-0 text-sm font-medium underline hover:no-underline transition-colors"
                >
                    {action.label}
                </button>
            )}
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Dismiss"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    );
}

export interface ToastContainerProps {
    toasts: Array<{id: string; message: string; type?: 'info' | 'success' | 'warning' | 'error'; duration?: number; action?: {label: string; onClick: () => void}}>;
    onClose: (id: string) => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({toasts, onClose, position = 'top-right'}: ToastContainerProps) {
    const positionStyles = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    return (
        <div
            className={cn(
                'fixed z-[600] flex flex-col gap-2 pointer-events-none',
                positionStyles[position]
            )}
            aria-live="polite"
            aria-atomic="true"
        >
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
                    <Toast {...toast} onClose={onClose} />
                </div>
            ))}
        </div>
    );
}