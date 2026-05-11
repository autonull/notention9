import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'purple' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
    size?: 'sm' | 'md';
    pill?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
}

export function Badge({
                          children,
                          variant = 'default',
                          className = '',
                          size = 'md',
                          pill = false,
                          icon: Icon,
                          ...props
                      }: BadgeProps) {
    const baseStyles = `inline-flex items-center justify-center border font-medium ${pill ? 'rounded-full' : 'rounded'}`;

    const sizeStyles = {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2.5 py-0.5"
    };

    const variantStyles = {
        default: "bg-gray-800 border-gray-700 text-gray-400",
        primary: "bg-blue-900/30 border-blue-800 text-blue-400",
        success: "bg-green-900/30 border-green-800 text-green-400",
        warning: "bg-yellow-900/30 border-yellow-800 text-yellow-500",
        danger: "bg-red-500 border-red-600 text-white",
        outline: "bg-transparent border-gray-600 text-gray-400",
        purple: "bg-purple-900/30 border-purple-800 text-purple-300",
        info: "bg-blue-900/30 border-blue-800 text-blue-400"
    };

    return (
        <span
            className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {Icon && <Icon className={`mr-1 ${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}/>}
            {children}
        </span>
    );
};
