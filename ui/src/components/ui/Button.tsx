import React from 'react';
import {cn} from '../../utils/ui';
import {
    getButtonClasses,
    getIconButtonClasses,
    getIconSizeClass,
    ButtonVariant,
    ButtonSize,
    IconButtonVariant,
} from './buttonVariants';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
    touchTarget?: boolean;
    /** Use focus-visible ring instead of default outline */
    focusRing?: boolean;
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
    touchTarget = true,
    focusRing = true,
    ...props
}: ButtonProps) {
    return (
        <button
            className={getButtonClasses({variant, size, fullWidth, touchTarget, focusRing, className, disabled, loading})}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
    variant?: IconButtonVariant;
    size?: ButtonSize;
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
    containerClassName?: string;
    label?: string;
    touchTarget?: boolean;
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
    touchTarget = true,
    ...props
}: IconButtonProps) {
    const button = (
        <button
            className={getIconButtonClasses({variant, size, touchTarget, className, disabled, isActive})}
            disabled={disabled}
            title={tooltip ? undefined : title}
            aria-label={props['aria-label'] || title || tooltip}
            type="button"
            aria-pressed={isActive}
            {...props}
        >
            <Icon className={getIconSizeClass(size)}/>
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

// Need to import Tooltip from Overlay
import {Tooltip} from './Overlay';