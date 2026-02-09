import React from 'react';
import {Tooltip} from './Tooltip';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ComponentType<{ className?: string }>;
    isActive?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
    containerClassName?: string;
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
                               ...props
                           }: IconButtonProps) {
    const baseClasses = "rounded-lg transition-all duration-200 flex items-center justify-center";

    const sizeClasses = {
        xs: "p-1",
        sm: "p-1",
        md: "p-1.5",
        lg: "p-2",
    };

    const getVariantClasses = () => {
        switch (variant) {
            case 'primary':
                return "bg-blue-600 hover:bg-blue-700 text-white shadow-sm";
            case 'secondary':
                return "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700";
            case 'danger':
                return "bg-transparent text-gray-400 hover:text-red-400 hover:bg-red-900/30";
            case 'ghost':
            default:
                return isActive
                    ? "bg-blue-600/90 text-white shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-gray-800";
        }
    };

    const iconSizes = {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-4 w-4",
        lg: "h-5 w-5"
    };

    const button = (
        <button
            className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${getVariantClasses()}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
      `}
            disabled={disabled}
            title={tooltip ? undefined : title} // Use native title only if no custom tooltip
            aria-label={props['aria-label'] || title || tooltip}
            type="button"
            aria-pressed={isActive}
            {...props}
        >
            <Icon className={iconSizes[size]}/>
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
