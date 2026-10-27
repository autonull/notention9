import React from 'react';
import {cn} from '../../utils/ui';

export interface SkipLinkProps {
    targetId: string;
    label?: string;
    className?: string;
}

/**
 * Skip link for keyboard accessibility - allows users to skip to main content
 */
export function SkipLink({targetId, label = 'Skip to main content', className = ''}: SkipLinkProps) {
    return (
        <a
            href={`#${targetId}`}
            className={cn(
                'skip-link',
                'sr-only focus:not-sr-only',
                'z-[9999]',
                'inline-flex items-center gap-2',
                'px-4 py-2',
                'bg-blue-600 text-white',
                'font-medium',
                'rounded-lg',
                'shadow-xl',
                'transition-all duration-150',
                className
            )}
        >
            {label}
        </a>
    );
}

/**
 * Multiple skip links for complex layouts
 */
export interface SkipLinkItem {
    id: string;
    label: string;
}

export function SkipLinks({links = [
    {id: 'main-content', label: 'Skip to main content'},
    {id: 'sidebar', label: 'Skip to navigation'},
    {id: 'header', label: 'Skip to header'},
]}: {links?: SkipLinkItem[]}) {
    return (
        <div className="fixed top-0 left-0 z-[9999] flex flex-col pointer-events-none" aria-hidden="true">
            {links.map((link, index) => (
                <SkipLink
                    key={link.id}
                    targetId={link.id}
                    label={link.label}
                    className={index === 0 ? '' : 'top-auto'}
                />
            ))}
        </div>
    );
}