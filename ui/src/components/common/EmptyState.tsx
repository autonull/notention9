import React from 'react';
import {cn} from '../../utils/ui';

interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    iconClassName?: string;
    variant?: 'default' | 'card' | 'minimal' | 'illustrated' | 'onboarding';
    illustration?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    showSearchSuggestion?: boolean;
    searchTerm?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = '',
    iconClassName = 'h-12 w-12',
    variant = 'default',
    illustration,
    secondaryAction,
    showSearchSuggestion = false,
    searchTerm
}: EmptyStateProps) {
    const variantStyles = {
        default: 'flex flex-col items-center justify-center py-12 px-4 text-center',
        card: 'empty-state p-8',
        minimal: 'flex flex-col items-center justify-center py-6 px-4 text-center',
        illustrated: 'flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto',
        onboarding: 'flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto',
    };

    const iconContainerStyles = {
        default: 'flex items-center justify-center rounded-full mb-4 bg-gray-800 p-4',
        card: 'empty-state-icon',
        minimal: 'flex items-center justify-center rounded-full mb-3 bg-gray-800 p-3',
        illustrated: 'flex items-center justify-center rounded-full mb-6 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30',
        onboarding: 'flex items-center justify-center rounded-full mb-8 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 animate-pulse-subtle',
    };

    const titleStyles = {
        default: 'font-medium text-gray-300 text-lg mb-2',
        card: 'empty-state-title text-lg',
        minimal: 'font-medium text-gray-300 text-base mb-1',
        illustrated: 'font-semibold text-white text-xl mb-3',
        onboarding: 'font-bold text-white text-2xl mb-4',
    };

    const descriptionStyles = {
        default: 'text-sm max-w-xs text-gray-500 mb-6',
        card: 'empty-state-description text-gray-500',
        minimal: 'text-sm max-w-xs text-gray-500 mb-4',
        illustrated: 'text-base max-w-md text-gray-400 mb-8 leading-relaxed',
        onboarding: 'text-lg max-w-lg text-gray-300 mb-10 leading-relaxed',
    };

    return (
        <div className={cn(variantStyles[variant], className)}>
            {illustration ? (
                <div className="mb-6" aria-hidden="true">{illustration}</div>
            ) : Icon && (
                <div className={cn(iconContainerStyles[variant] || iconContainerStyles.default)}>
                    <Icon className={iconClassName}/>
                </div>
            )}
            <h3 className={cn(titleStyles[variant] || titleStyles.default)}>
                {title}
            </h3>
            {description && (
                <div className={cn(descriptionStyles[variant] || descriptionStyles.default)}>
                    {description}
                </div>
            )}
            {showSearchSuggestion && searchTerm && (
                <div className="mb-6 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 max-w-xs text-left animate-slide-in-up">
                    <p className="text-xs text-gray-500 mb-1">Try searching for:</p>
                    <code className="text-sm text-blue-400 font-mono">#{searchTerm}</code>
                    <p className="text-xs text-gray-500 mt-1">or</p>
                    <code className="text-sm text-blue-400 font-mono">{searchTerm}</code>
                </div>
            )}
            {action && (
                <div className="w-full max-w-xs flex flex-col gap-2">{action}</div>
            )}
            {secondaryAction && (
                <div className="mt-4 w-full max-w-xs flex flex-col gap-2">{secondaryAction}</div>
            )}
        </div>
    );
};

export function EmptyStateIllustration({children}: {children: React.ReactNode}) {
    return (
        <svg className="w-48 h-48 text-gray-700/50" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1"/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1"/>
                </linearGradient>
            </defs>
            <rect width="200" height="200" rx="20" fill="url(#grad1)"/>
            <g transform="translate(100, 100)">
                {children}
            </g>
        </svg>
    );
}

export function NotesEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="0" cy="-20" r="35" stroke="#6b7280" strokeWidth="2" fill="none" strokeDasharray="10,5" opacity="0.5"/>
            <path d="M-30 20 L30 20" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-20 35 L20 35" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-15 50 L15 50" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <circle cx="-40" cy="-30" r="4" fill="#3b82f6" opacity="0.6"/>
            <circle cx="40" cy="-30" r="4" fill="#7c3aed" opacity="0.6"/>
            <circle cx="0" cy="10" r="4" fill="#16a34a" opacity="0.6"/>
        </EmptyStateIllustration>
    );
}

export function SearchEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="0" cy="0" r="30" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M15 15 L25 25" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-25 -10 Q0 10 25 -10" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8"/>
            <circle cx="-15" cy="-15" r="3" fill="#3b82f6" opacity="0.8"/>
            <circle cx="15" cy="-15" r="3" fill="#7c3aed" opacity="0.8"/>
        </EmptyStateIllustration>
    );
}

export function NetworkEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="-40" cy="-20" r="18" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="40" cy="-20" r="18" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="0" cy="30" r="18" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <path d="M-28 -20 L28 -20" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M-12 -5 Q0 15 12 -5" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M-12 -5 Q-26 20 -12 30" stroke="#16a34a" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M12 -5 Q26 20 12 30" stroke="#ca8a04" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <circle cx="-40" cy="-20" r="4" fill="#3b82f6" opacity="0.8"/>
            <circle cx="40" cy="-20" r="4" fill="#7c3aed" opacity="0.8"/>
            <circle cx="0" cy="30" r="4" fill="#16a34a" opacity="0.8"/>
        </EmptyStateIllustration>
    );
}

export function TrashEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <path d="M-25 -40 L25 -40" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M-35 -40 L-35 20 Q0 40 35 20 L35 -40" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <path d="M-15 -40 L-15 -10" stroke="#6b7280" strokeWidth="1.5" opacity="0.3"/>
            <path d="M0 -40 L0 -10" stroke="#6b7280" strokeWidth="1.5" opacity="0.3"/>
            <path d="M15 -40 L15 -10" stroke="#6b7280" strokeWidth="1.5" opacity="0.3"/>
            <path d="M-20 5 L20 5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M0 -15 L0 10" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5"/>
            <circle cx="0" cy="10" r="5" fill="#3b82f6" opacity="0.6"/>
        </EmptyStateIllustration>
    );
}