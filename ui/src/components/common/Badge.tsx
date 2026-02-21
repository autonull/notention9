import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
    size?: 'sm' | 'md';
    icon?: React.ComponentType<{ className?: string }>;
}

export function Badge({
                          children,
                          variant = 'default',
                          className = '',
                          size = 'md',
                          icon: Icon
                      }: BadgeProps) {
    const baseStyles = "inline-flex items-center justify-center rounded border font-medium";

    const sizeStyles = {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2.5 py-0.5"
    };

    const variantStyles = {
        default: "bg-gray-800 border-gray-700 text-gray-400",
        primary: "bg-blue-900/30 border-blue-800 text-blue-400",
        success: "bg-green-900/30 border-green-800 text-green-400",
        warning: "bg-yellow-900/30 border-yellow-800 text-yellow-500",
        danger: "bg-red-900/30 border-red-800 text-red-400",
        outline: "bg-transparent border-gray-600 text-gray-400"
    };

    return (
        <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {Icon && <Icon className={`mr-1 ${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}/>}
            {children}
    </span>
    );
};
