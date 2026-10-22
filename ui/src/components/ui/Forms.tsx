import React from 'react';
import {cn} from '../../utils/ui';

export interface FormFieldProps {
    label?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
    htmlFor?: string;
}

export function FormField({
    label,
    required,
    error,
    hint,
    children,
    className = '',
    htmlFor,
}: FormFieldProps) {
    const id = React.useId();
    const errorId = error ? `${id}-error` : undefined;
    const hintId = hint ? `${id}-hint` : undefined;

    return (
        <div className={cn('space-y-1.5', className)}>
            {label && (
                <label
                    htmlFor={htmlFor || id}
                    className="block text-sm font-medium text-gray-300 flex items-center gap-1.5"
                >
                    {label}
                    {required && <span className="text-red-400" aria-hidden="true">*</span>}
                </label>
            )}
            <div>{children}</div>
            {error && (
                <p id={errorId} className="text-sm text-red-400 flex items-center gap-1" role="alert">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                    </svg>
                    {error}
                </p>
            )}
            {hint && !error && (
                <p id={hintId} className="text-sm text-gray-500">{hint}</p>
            )}
        </div>
    );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    rows?: number;
    autoResize?: boolean;
}

export function Textarea({
    label,
    required,
    error,
    hint,
    rows = 4,
    autoResize = false,
    className = '',
    id,
    ...props
}: TextareaProps) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fieldId = id || React.useId();

    React.useEffect(() => {
        if (autoResize && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [props.value, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        props.onChange?.(e);
        if (autoResize) {
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
            }, 0);
        }
    };

    return (
        <FormField label={label} required={required} error={error} hint={hint} htmlFor={fieldId}>
            <textarea
                ref={textareaRef}
                id={fieldId}
                rows={rows}
                className={cn(
                    'w-full bg-gray-950/50 border border-gray-700/50 rounded-xl',
                    'text-white placeholder-gray-600 resize-none',
                    'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20',
                    'transition-all duration-150 px-4 py-3 text-sm',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
                    className
                )}
                onChange={handleChange}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={cn(error ? `${fieldId}-error` : undefined, hint ? `${fieldId}-hint` : undefined)}
                {...props}
            />
        </FormField>
    );
}

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    icon?: React.ReactNode;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    options: SelectOption[];
    placeholder?: string;
    searchable?: boolean;
    multiple?: boolean;
}

export function Select({
    label,
    required,
    error,
    hint,
    options,
    placeholder,
    searchable = false,
    multiple = false,
    className = '',
    id,
    ...props
}: SelectProps) {
    const fieldId = id || React.useId();

    if (searchable) {
        return (
            <FormField label={label} required={required} error={error} hint={hint} htmlFor={fieldId}>
                <div className="relative">
                    <select
                        id={fieldId}
                        className={cn(
                            'w-full bg-gray-950/50 border border-gray-700/50 rounded-xl',
                            'text-white appearance-none',
                            'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20',
                            'transition-all duration-150 px-4 py-3 pr-10 text-sm',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
                            className
                        )}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={cn(error ? `${fieldId}-error` : undefined, hint ? `${fieldId}-hint` : undefined)}
                        multiple={multiple}
                        {...props}
                    >
                        {placeholder && (
                            <option value="" disabled>
                                {placeholder}
                            </option>
                        )}
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </div>
            </FormField>
        );
    }

    return (
        <FormField label={label} required={required} error={error} hint={hint} htmlFor={fieldId}>
            <select
                id={fieldId}
                className={cn(
                    'w-full bg-gray-950/50 border border-gray-700/50 rounded-xl',
                    'text-white appearance-none',
                    'focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20',
                    'transition-all duration-150 px-4 py-3 pr-10 text-sm',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
                    className
                )}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={cn(error ? `${fieldId}-error` : undefined, hint ? `${fieldId}-hint` : undefined)}
                multiple={multiple}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </FormField>
    );
}

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    description?: string;
    indeterminate?: boolean;
}

export function Checkbox({
    label,
    description,
    indeterminate,
    className = '',
    id,
    ...props
}: CheckboxProps) {
    const checkboxRef = React.useRef<HTMLInputElement>(null);
    const fieldId = id || React.useId();

    React.useEffect(() => {
        if (checkboxRef.current && indeterminate !== undefined) {
            checkboxRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return (
        <label className={cn('flex items-start gap-3 cursor-pointer', className)} htmlFor={fieldId}>
            <div className="relative flex-shrink-0 mt-0.5">
                <input
                    ref={checkboxRef}
                    type="checkbox"
                    id={fieldId}
                    className="w-4 h-4 rounded border-gray-600 text-blue-600 bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 focus:ring-offset-gray-950 transition-colors"
                    aria-describedby={description ? `${fieldId}-desc` : undefined}
                    {...props}
                />
            </div>
            <div className="flex-1">
                <span className="text-sm font-medium text-gray-200">{label}</span>
                {description && (
                    <p id={`${fieldId}-desc`} className="mt-0.5 text-sm text-gray-500">{description}</p>
                )}
            </div>
        </label>
    );
}

export interface RadioOption {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

export interface RadioGroupProps {
    label?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    orientation?: 'vertical' | 'horizontal';
    className?: string;
}

export function RadioGroup({
    label,
    required,
    error,
    hint,
    options,
    value,
    onChange,
    orientation = 'vertical',
    className = '',
}: RadioGroupProps) {
    const groupId = React.useId();

    return (
        <FormField label={label} required={required} error={error} hint={hint}>
            <fieldset className={cn('space-y-3', orientation === 'horizontal' && 'flex flex-wrap gap-4', className)}>
                {options.map((opt) => (
                    <label key={opt.value} className={cn(
                        'flex items-start gap-3 cursor-pointer transition-colors',
                        orientation === 'horizontal' && 'flex-1 min-w-[150px] p-3 rounded-xl border border-gray-700/50 hover:border-blue-500/50',
                        opt.disabled && 'opacity-50 cursor-not-allowed'
                    )}>
                        <input
                            type="radio"
                            name={groupId}
                            value={opt.value}
                            checked={value === opt.value}
                            onChange={() => !opt.disabled && onChange(opt.value)}
                            disabled={opt.disabled}
                            className="w-4 h-4 mt-0.5 text-blue-600 border-gray-600 bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 focus:ring-offset-gray-950"
                        />
                        <div className="flex-1">
                            <span className="text-sm font-medium text-gray-200">{opt.label}</span>
                            {opt.description && <p className="mt-0.5 text-sm text-gray-500">{opt.description}</p>}
                        </div>
                    </label>
                ))}
            </fieldset>
        </FormField>
    );
}

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function Switch({
    label,
    description,
    size = 'md',
    className = '',
    id,
    ...props
}: SwitchProps) {
    const fieldId = id || React.useId();

    const sizeStyles = {
        sm: 'w-8 h-5',
        md: 'w-11 h-6',
        lg: 'w-14 h-7',
    };

    const thumbSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    return (
        <label className={cn('flex items-center gap-3 cursor-pointer', className)} htmlFor={fieldId}>
            <div className="relative flex-shrink-0">
                <input
                    type="checkbox"
                    id={fieldId}
                    role="switch"
                    className={cn(
                        'peer appearance-none rounded-full bg-gray-700 border border-gray-600',
                        'checked:bg-blue-600 checked:border-blue-600',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 focus:ring-offset-gray-950',
                        'transition-all duration-200',
                        'after:content-[""] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:transition-transform',
                        'peer-checked:after:translate-x-full',
                        sizeStyles[size],
                        thumbSizes[size].replace('w-', 'after:w-').replace('h-', 'after:h-'),
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    aria-describedby={description ? `${fieldId}-desc` : undefined}
                    {...props}
                />
            </div>
            <div className="flex-1">
                <span className="text-sm font-medium text-gray-200">{label}</span>
                {description && (
                    <p id={`${fieldId}-desc`} className="mt-0.5 text-sm text-gray-500">{description}</p>
                )}
            </div>
        </label>
    );
}

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    showValue?: boolean;
    valueLabel?: (value: number) => string;
}

export function Slider({
    label,
    min = 0,
    max = 100,
    step = 1,
    showValue = true,
    valueLabel,
    className = '',
    id,
    ...props
}: SliderProps) {
    const fieldId = id || React.useId();
    const rawValue = props.value ?? props.defaultValue ?? min;
    const value = typeof rawValue === 'number' ? rawValue : typeof rawValue === 'string' ? parseFloat(rawValue) : min;
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <FormField label={label}>
            <div className="relative">
                <div className="relative h-2">
                    <div
                        className="absolute inset-0 bg-gray-700 rounded-full overflow-hidden"
                        aria-hidden="true"
                    >
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-100"
                            style={{width: `${percentage}%`}}
                        />
                    </div>
                    <input
                        type="range"
                        id={fieldId}
                        min={min}
                        max={max}
                        step={step}
                        className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer focus:outline-none"
                        onChange={(e) => props.onChange?.(e)}
                        aria-valuemin={min}
                        aria-valuemax={max}
                        aria-valuenow={value}
                        {...({...props, value: undefined, defaultValue: undefined, onChange: undefined} as any)}
                    />
                </div>
                {showValue && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-gray-500">{min}</span>
                        <span className="font-mono text-white">{valueLabel ? valueLabel(value) : value}</span>
                        <span className="text-gray-500">{max}</span>
                    </div>
                )}
            </div>
        </FormField>
    );
}

export interface FormProps {
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    className?: string;
    noValidate?: boolean;
}

export function Form({children, onSubmit, className = '', noValidate = true}: FormProps) {
    return (
        <form onSubmit={onSubmit} noValidate={noValidate} className={cn('space-y-6', className)}>
            {children}
        </form>
    );
}

export interface FormActionsProps {
    children: React.ReactNode;
    className?: string;
    align?: 'start' | 'center' | 'end' | 'stretch';
}

export function FormActions({children, className = '', align = 'end'}: FormActionsProps) {
    return (
        <div className={cn('flex flex-wrap gap-3 pt-4 border-t border-gray-700/50', 'justify-' + align, className)}>
            {children}
        </div>
    );
}