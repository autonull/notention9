import React from 'react';
import {Tooltip} from '../common/Tooltip';
import {Badge} from '../common/Badge';

export interface NavButtonProps {
    icon: React.ReactElement<{ className?: string }>;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badgeCount?: number;
    tooltip?: string;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function NavButton({
                                                        icon,
                                                        label,
                                                        isActive,
                                                        onClick,
                                                        badgeCount,
                                                        tooltip,
                                                        tooltipPosition = 'bottom'
                                                    }: NavButtonProps) {
    // Use label as default tooltip if not suppressed (e.g. by explicitly passing empty string if we wanted that, but here we assume label is good default)
    const tooltipContent = tooltip ?? label;

    const button = (
        <button
            onClick={onClick}
            aria-label={label}
            aria-pressed={isActive}
            className={`relative p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                isActive
                    ? 'bg-blue-900/40 text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200'
            }`}
        >
            {React.cloneElement(icon, {className: 'h-5 w-5'})}
            {badgeCount !== undefined && badgeCount > 0 && (
                <Badge
                    variant="danger"
                    size="sm"
                    pill
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 font-bold ring-1 ring-gray-900"
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
