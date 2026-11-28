import React, {useId, useMemo} from 'react';
import type {WidgetProps} from './types';

/**
 * BasePropertyWidget - Shared functionality for property widgets
 * 
 * Provides:
 * - Consistent base styling
 * - Accessibility attributes (aria-invalid, aria-describedby)
 * - Error display
 * - Focus management
 * - Validation pipeline
 * - Formatting helpers
 */

export interface BasePropertyWidgetProps extends WidgetProps {
    /** Error message to display */
    error?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Label for accessibility */
    label?: string;
    /** Helper text */
    helperText?: string;
    /** Whether the widget is disabled */
    disabled?: boolean;
    /** Custom validation function */
    validate?: (value: string) => string | undefined;
    /** Format value for display */
    format?: (value: string) => string;
    /** Parse formatted value back to raw */
    parse?: (value: string) => string;
}

export interface BasePropertyWidgetState {
    value: string;
    error: string | undefined;
    isFocused: boolean;
}

const BASE_INPUT_CLASSES = 
    'w-full bg-neutral-700 border border-neutral-600 rounded px-3 py-1.5 text-sm text-white ' +
    'placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
    'transition-colors duration-150';

const BASE_ERROR_CLASSES = 'border-red-500 focus:ring-red-500';

const ERROR_MESSAGE_CLASSES = 'mt-1 text-xs text-red-400';
const HELPER_TEXT_CLASSES = 'mt-1 text-xs text-neutral-400';

/**
 * Hook for shared widget state and validation
 */
export function useBasePropertyWidget(props: BasePropertyWidgetProps) {
    const {value, onChange, validate, error: externalError, required, format, parse} = props;
    const [isFocused, setIsFocused] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string | undefined>(undefined);

    // Format value for display
    const displayValue = useMemo(() => format ? format(value) : value, [format, value]);

    // Validate on change
    const validationError = useMemo(() => {
        if (validate) return validate(value);
        if (required && !value.trim()) return 'This field is required';
        return undefined;
    }, [validate, required, value]);

    // Combined error (external takes precedence)
    const error = externalError ?? validationError ?? internalError;

    const handleChange = (rawValue: string) => {
        const parsedValue = parse ? parse(rawValue) : rawValue;
        onChange(parsedValue);
        setInternalError(undefined); // Clear internal error on change
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    return {
        displayValue,
        error,
        isFocused,
        handleChange,
        handleFocus,
        handleBlur,
        setInternalError,
    };
}

/**
 * Base input component with shared accessibility and styling
 * Uses a simplified prop interface that expects string-based onChange
 */
interface BaseInputProps {
    type?: string;
    value: string;
    onChange?: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    id?: string;
    'aria-describedby'?: string;
    className?: string;
}

export function BaseInput({
    type = 'text',
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    placeholder,
    disabled,
    required,
    error,
    id,
    'aria-describedby': ariaDescribedBy,
    className = '',
}: BaseInputProps) {
    const combinedClasses = [
        BASE_INPUT_CLASSES,
        error ? BASE_ERROR_CLASSES : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : ariaDescribedBy}
            id={id}
            className={combinedClasses}
        />
    );
}

/**
 * Base select component with shared accessibility and styling
 */
interface BaseSelectProps {
    value: string;
    onChange?: (value: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    id?: string;
    'aria-describedby'?: string;
    className?: string;
    children: React.ReactNode;
}

export function BaseSelect({
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    disabled,
    required,
    error,
    id,
    'aria-describedby': ariaDescribedBy,
    className = '',
    children,
}: BaseSelectProps) {
    const combinedClasses = [
        BASE_INPUT_CLASSES,
        error ? BASE_ERROR_CLASSES : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <select
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : ariaDescribedBy}
            id={id}
            className={combinedClasses}
        >
            {children}
        </select>
    );
}

/**
 * Error message component
 */
export function ErrorMessage({error, id}: {error?: string; id: string}) {
    if (!error) return null;
    return (
        <div id={`${id}-error`} className={ERROR_MESSAGE_CLASSES} role="alert" aria-live="polite">
            {error}
        </div>
    );
}

/**
 * Helper text component
 */
export function HelperText({text, id}: {text?: string; id: string}) {
    if (!text) return null;
    return (
        <div id={`${id}-helper`} className={HELPER_TEXT_CLASSES}>
            {text}
        </div>
    );
}

/**
 * Label component
 */
export function WidgetLabel({label, required, htmlFor}: {label?: string; required?: boolean; htmlFor: string}) {
    if (!label) return null;
    return (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-neutral-300 mb-1">
            {label}
            {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
        </label>
    );
}

/**
 * Wrapper component that composes label, input, error, and helper text
 */
export function PropertyWidgetWrapper({
    children,
    label,
    helperText,
    error,
    required,
    id: providedId,
    className = '',
}: {
    children: React.ReactElement;
    label?: string;
    helperText?: string;
    error?: string;
    required?: boolean;
    id?: string;
    className?: string;
}) {
    const generatedId = useId();
    const id = providedId ?? generatedId;

    const describedBy = [
        error ? `${id}-error` : null,
        helperText ? `${id}-helper` : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
        <div className={`space-y-1 ${className}`}>
            <WidgetLabel label={label} required={required} htmlFor={id} />
            <div aria-describedby={describedBy}>
                {React.cloneElement(children, {
                    id,
                    'aria-describedby': describedBy,
                    error,
                } as Record<string, unknown>)}
            </div>
            <ErrorMessage error={error} id={id} />
            <HelperText text={helperText} id={id} />
        </div>
    );
}