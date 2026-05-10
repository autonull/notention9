import React from 'react';
import {Tooltip} from '../common/Tooltip';

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
                <span
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-gray-900">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
            )}
        </button>
    );

    return (
        <Tooltip content={tooltipContent} position={tooltipPosition}>
            {button}
        </Tooltip>
    );
}
