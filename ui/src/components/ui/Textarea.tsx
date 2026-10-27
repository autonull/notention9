import React, { forwardRef } from 'react';
import { cn } from '../../utils/ui';
import { componentTokens } from '../../styles/tokens';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
    label,
    error,
    className = '',
    id,
    ...props
}, ref) => {
    const tokens = componentTokens.input;
    const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
        <div className={className}>
            {label && (
                <label htmlFor={inputId} className={tokens.label}>
                    {label}
                </label>
            )}
            <textarea
                ref={ref}
                id={inputId}
                className={cn(
                    tokens.base,
                    tokens.padding,
                    'custom-scrollbar',
                    error && tokens.error
                )}
                {...props}
            />
            {error && (
                <p className={tokens.errorText}>{error}</p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';