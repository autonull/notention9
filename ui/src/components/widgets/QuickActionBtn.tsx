import React from 'react';

export interface QuickActionBtnProps {
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    colorClass: string;
    hoverBorder: string;
    hoverShadow: string;
}

export function QuickActionBtn({
                                   onClick,
                                   icon: Icon,
                                   label,
                                   colorClass,
                                   hoverBorder,
                                   hoverShadow
                               }: QuickActionBtnProps) {
    return (
        <button
            onClick={onClick}
            className={`group p-4 bg-gray-900/50 hover:bg-gray-800 rounded-xl flex flex-col items-center gap-3 transition-all border border-gray-700/50 ${hoverBorder} ${hoverShadow}`}
        >
            <div
                className={`p-3 rounded-full transition-all transform group-hover:scale-110 ${colorClass} group-hover:text-white`}>
                <Icon className="h-6 w-6"/>
            </div>
            <span className="font-medium text-sm text-gray-300 group-hover:text-white">{label}</span>
        </button>
    );
}
