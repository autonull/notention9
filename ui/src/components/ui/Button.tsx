import React, { forwardRef } from 'react';
import { cn } from '../../utils/ui';
import { componentTokens, iconSizes } from '../../styles/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    /** Icon component to render on the left (alternative to leftIcon) */
    icon?: React.ComponentType<{ className?: string }>;
    fullWidth?: boolean;
    touchTarget?: boolean;
    /** Use focus-visible ring instead of default outline */
    focusRing?: boolean;
    /** Tooltip text to show on hover */
    tooltip?: string;
    /** Tooltip position */
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            loading = false,
            leftIcon,
            rightIcon,
            icon,
            fullWidth = false,
            className = '',
            disabled,
            children,
            touchTarget = true,
            focusRing = true,
            ...props
        },
        ref
    ) => {
        const tokens = componentTokens.button;
        const baseClasses = cn(
            tokens.base,
            tokens.sizes[size],
            tokens.variants[variant],
            fullWidth && 'w-full',
            touchTarget && 'touch-target-48',
            focusRing && 'focus-ring-high-contrast',
            disabled && tokens.disabled,
            loading && tokens.loading,
            className
        );

        // Filter out non-DOM props that might be passed via spread (from IconButton usage)
        const domProps = { ...props };
        delete (domProps as any).tooltip;
        delete (domProps as any).tooltipPosition;
        delete (domProps as any).isActive;
        delete (domProps as any).label;
        delete (domProps as any).containerClassName;
        delete (domProps as any).icon;

        // Resolve leftIcon: explicit leftIcon takes precedence, then icon component
        const resolvedLeftIcon = leftIcon ?? (icon ? <icon className={iconSizes[size]} /> : null);

        return (
            <button
                ref={ref}
                className={baseClasses}
                disabled={disabled || loading}
                {...domProps}
            >
                {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : resolvedLeftIcon ? (
                    <span className="flex-shrink-0" aria-hidden="true">{resolvedLeftIcon}</span>
                ) : null}
                {children}
                {!loading && rightIcon && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
            </button>
        );
    }
);

Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ComponentType<{ className?: string }>;
    isActive?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg';
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
    const tokens = componentTokens.button;
    const activeVariant = isActive && variant === 'ghost' ? 'primary' : variant;

    const buttonClasses = cn(
        tokens.base,
        tokens.sizes[size],
        tokens.variants[activeVariant],
        touchTarget && 'touch-target-48',
        'focus-ring-high-contrast',
        disabled && tokens.disabled,
        'active:scale-[0.95] transition-transform duration-50',
        className
    );

    // Filter out non-DOM props explicitly to prevent React warnings
    const domProps = { ...props };
    delete (domProps as any).tooltip;
    delete (domProps as any).tooltipPosition;
    delete (domProps as any).icon;
    delete (domProps as any).isActive;
    delete (domProps as any).label;
    delete (domProps as any).containerClassName;
    delete (domProps as any).touchTarget;
    delete (domProps as any).variant;
    delete (domProps as any).size;
    delete (domProps as any).className;
    delete (domProps as any).title;
    delete (domProps as any).disabled;

    const button = (
        <button
            className={buttonClasses}
            disabled={disabled}
            title={tooltip ? undefined : title}
            aria-label={domProps['aria-label'] || title || tooltip}
            type="button"
            aria-pressed={isActive}
            {...domProps}
        >
            <Icon className={iconSizes[size]} />
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

import { Tooltip } from './Overlay';