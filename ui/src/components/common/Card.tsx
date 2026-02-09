import React from 'react';

export interface CardProps {
    title?: React.ReactNode;
    icon?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    headerAction?: React.ReactNode;
    variant?: 'default' | 'glass' | 'gradient';
}

export function Card({
                         title,
                         icon: Icon,
                         children,
                         className = '',
                         headerAction,
                         variant = 'default',
                     }: CardProps) {
    const variantClasses = {
        default: "bg-gray-800 border border-gray-700/50",
        glass: "bg-gray-900/50 backdrop-blur-sm border border-gray-700/30",
        gradient: "bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/30",
    };

    return (
        <div className={`rounded-2xl p-6 ${variantClasses[variant]} ${className}`}>
            {(title || Icon || headerAction) && (
                <div className="flex justify-between items-start mb-4">
                    {(title || Icon) && (
                        <div className="flex items-center gap-2">
                            {Icon && <Icon className="h-5 w-5 text-gray-400"/>}
                            {typeof title === 'string' ? (
                                <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
                            ) : (
                                title
                            )}
                        </div>
                    )}
                    {headerAction}
                </div>
            )}
            {children}
        </div>
    );
};
