import React from 'react';
import {Tooltip} from '../ui/Overlay';
import {Badge} from '../ui/Badge';
import {cn} from '../../utils/ui';

export interface NavButtonProps {
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badgeCount?: number;
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
    /** Show the label beside the icon for discoverability. */
    showLabel?: boolean;
}

export function NavButton({
                                                        icon,
                                                        label,
                                                        isActive,
                                                        onClick,
                                                        badgeCount,
                                                        tooltip,
                                                        tooltipPosition = 'bottom',
                                                        showLabel = false
                                                    }: NavButtonProps) {
    // Use label as default tooltip if not suppressed (e.g. by explicitly passing empty string if we wanted that, but here we assume label is good default)
    const tooltipContent = tooltip ?? label;

    const button = (
        <button
            onClick={onClick}
            aria-label={label}
            aria-pressed={isActive}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'relative flex items-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 touch-target',
                showLabel ? 'gap-1.5 px-2.5 py-2' : 'p-2',
                isActive
                    ? 'bg-blue-900/40 text-blue-400 shadow-sm'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            )}
        >
            {React.cloneElement(icon, {className: showLabel ? 'h-4 w-4' : 'h-5 w-5'})}
            {showLabel && (
                <span className={cn('text-xs font-medium', !isActive && 'text-neutral-400')}>{label}</span>
            )}
            {badgeCount !== undefined && badgeCount > 0 && (
                <Badge
                    variant="danger"
                    size="sm"
                    pill
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 font-bold ring-1 ring-neutral-900"
                >
                    {badgeCount > 99 ? '99+' : badgeCount}
                </Badge>
            )}
        </button>
    );

    return (
        <Tooltip content={tooltipContent} position={tooltipPosition}>
            {button}
        </Tooltip>
    );
}
