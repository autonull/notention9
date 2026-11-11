import React, { forwardRef } from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    /** Icon component to render on the left (alternative to leftIcon) */
    icon?: React.ComponentType<{ className?: string }>;
    fullWidth?: boolean;
    touchTarget?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    icon,
    fullWidth = true,
    className = '',
    id,
    touchTarget = false,
    ...props
}, ref) => {
    const generatedId = React.useId();
    const inputId = id || `input-${generatedId}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const tokens = componentTokens.input;

    // Resolve leftIcon: explicit leftIcon takes precedence, then icon component
    const resolvedLeftIcon = leftIcon ?? (icon ? <icon className="w-5 h-5" /> : null);

    // Filter out non-DOM props
    const domProps = { ...props };
    delete (domProps as any).icon;
    delete (domProps as any).leftIcon;
    delete (domProps as any).rightIcon;
    delete (domProps as any).label;
    delete (domProps as any).error;
    delete (domProps as any).hint;
    delete (domProps as any).fullWidth;
    delete (domProps as any).touchTarget;

    return (
        <div className={cn('w-full', fullWidth && 'w-full')}>
            {label && (
                <label
                    htmlFor={inputId}
                    className={tokens.label}
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {resolvedLeftIcon && (
                    <div className={cn(tokens.iconWrapper, 'left-0 pl-3')}>
                        {resolvedLeftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        tokens.base,
                        tokens.padding,
                        leftIcon ? 'pl-10' : undefined,
                        rightIcon ? 'pr-10' : undefined,
                        error ? tokens.error : undefined,
                        touchTarget ? 'py-3 text-base' : undefined,
                        className
                    )}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={cn(errorId, hintId)}
                    {...domProps}
                />
                {rightIcon && (
                    <div className={cn(tokens.iconWrapper, 'right-0 pr-3')}>
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p id={errorId} className={tokens.errorText} role="alert">
                    {error}
                </p>
            )}
            {hint && !error && (
                <p id={hintId} className={tokens.hintText}>
                    {hint}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';