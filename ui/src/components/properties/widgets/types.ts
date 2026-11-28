import type React from 'react';

export interface WidgetProps {
    value: string;
    onChange: (val: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    
    // BasePropertyWidget optional props
    error?: string;
    required?: boolean;
    label?: string;
    helperText?: string;
    validate?: (value: string) => string | undefined;
    disabled?: boolean;
}

export interface TextWidgetProps extends WidgetProps {
    operator?: string;
    options?: string[];
    placeholder?: string;
}

export interface DateWidgetProps extends WidgetProps {
    type?: string;
}

export interface EnumWidgetProps extends WidgetProps {
    options?: string[];
}