import React from 'react';
import {Tooltip} from './Tooltip';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    icon?: React.ComponentType<{ className?: string }>;
    iconPosition?: 'left' | 'right';
    isLoading?: boolean;
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
    containerClassName?: string;
}

export function Button({
                           children,
                           variant = 'primary',
                           size = 'md',
                           icon: Icon,
                           iconPosition = 'left',
                           isLoading = false,
                           className = '',
                           disabled,
                           tooltip,
                           tooltipPosition = 'top',
                           containerClassName,
                           ...props
                       }: ButtonProps) {
    const baseClasses = "font-medium rounded-lg transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-gray-900";

    const sizeClasses = {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    const variantClasses = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 focus:ring-blue-500 border border-transparent",
        secondary: "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 focus:ring-gray-500",
        danger: "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-900/20 focus:ring-red-500 border border-transparent",
        success: "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 focus:ring-green-500 border border-transparent",
        ghost: "bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white focus:ring-gray-500",
        outline: "bg-transparent border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 focus:ring-gray-500",
    };

    const button = (
        <button
            className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
            disabled={disabled || isLoading}
            title={tooltip ? undefined : props.title}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg"
                     fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                            strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && Icon && iconPosition === 'left' && <Icon className={`w-4 h-4 ${children ? 'mr-2' : ''}`}/>}
            {children}
            {!isLoading && Icon && iconPosition === 'right' && <Icon className={`w-4 h-4 ${children ? 'ml-2' : ''}`}/>}
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
};
