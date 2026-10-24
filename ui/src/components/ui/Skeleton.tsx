import React from 'react';
import {cn} from '../../utils/ui';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular' | 'note-item' | 'card' | 'dashboard-stat' | 'network-event' | 'editor';
    width?: string | number;
    height?: string | number;
    lines?: number;
    animated?: boolean;
}

export function Skeleton({
    variant = 'text',
    width,
    height,
    lines = 1,
    animated = true,
    className = '',
    ...props
}: SkeletonProps) {
    const baseStyles = 'skeleton';
    const animatedClass = animated ? 'animate-shimmer' : '';

    const variantStyles: Record<string, string> = {
        text: 'h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
        'note-item': 'rounded-xl',
        card: 'rounded-xl p-4',
        'dashboard-stat': 'rounded-xl p-6',
        'network-event': 'rounded-xl p-4',
        editor: 'rounded-lg',
    };

    if (variant === 'text' && lines > 1) {
        return (
            <div className={cn(baseStyles, animatedClass, className)} {...props}>
                {Array.from({length: lines}).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-full',
                            i === lines - 1 ? 'w-3/4' : '',
                            'mb-2 last:mb-0'
                        )}
                        style={{height: '1rem', width: i === lines - 1 ? '60%' : '100%'}}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(baseStyles, variantStyles[variant], animatedClass, className)}
            style={{
                width: width ?? (variant === 'circular' ? height : undefined),
                height: height ?? (variant === 'circular' ? width : undefined),
            }}
            {...props}
        />
    );
}

export function NoteItemSkeleton() {
    return (
        <div className="note-list-item group relative flex flex-col p-3 rounded-lg cursor-pointer transition-all duration-200 bg-transparent animate-fade-in">
            <div className="flex justify-between items-center mb-1 gap-2 relative z-10 pl-1">
                <Skeleton variant="text" width="60%" className="font-semibold text-sm leading-tight"/>
                <Skeleton variant="circular" width={18} height={18}/>
            </div>
            <Skeleton variant="text" lines={2} className="pl-1 mb-2"/>
            <div className="flex items-center justify-between pl-1 relative z-10">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <Skeleton variant="text" width="80px" className="text-[10px] whitespace-nowrap"/>
                    <div className="flex gap-1">
                        <Skeleton variant="text" width="50px" height="16px" className="text-[9px] uppercase tracking-wider font-bold rounded"/>
                        <Skeleton variant="text" width="50px" height="16px" className="text-[9px] uppercase tracking-wider font-bold rounded"/>
                    </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0">
                    <Skeleton variant="circular" width={24} height={24}/>
                    <Skeleton variant="circular" width={24} height={24}/>
                    <Skeleton variant="circular" width={24} height={24}/>
                </div>
            </div>
        </div>
    );
}

export function DashboardStatSkeleton() {
    return (
        <Skeleton variant="dashboard-stat" className="animate-fade-in">
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} className="p-2 bg-gray-800 rounded-xl"/>
                <div className="flex-1 min-w-0">
                    <Skeleton variant="text" width="40%" className="text-sm"/>
                    <Skeleton variant="text" width="80px" className="text-3xl font-bold mt-2"/>
                </div>
            </div>
        </Skeleton>
    );
}

export function NetworkEventSkeleton() {
    return (
        <Skeleton variant="network-event" className="animate-fade-in border border-gray-700/50">
            <div className="flex items-start gap-4">
                <Skeleton variant="circular" width={44} height={44} className="flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <Skeleton variant="text" width="60%" className="font-medium"/>
                        <Skeleton variant="text" width="80px" className="text-xs text-right"/>
                    </div>
                    <Skeleton variant="text" lines={2} className="mt-2 text-sm"/>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Skeleton variant="text" width="80px" height="24px" className="rounded-full"/>
                        <Skeleton variant="text" width="80px" height="24px" className="rounded-full"/>
                    </div>
                </div>
            </div>
        </Skeleton>
    );
}

export function EditorSkeleton() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 border-b border-gray-700/50">
                <Skeleton variant="text" width="40%" className="text-xl font-semibold mb-2"/>
                <div className="flex flex-wrap gap-2">
                    <Skeleton variant="text" width="80px" height="24px" className="rounded-full"/>
                    <Skeleton variant="text" width="80px" height="24px" className="rounded-full"/>
                    <Skeleton variant="text" width="80px" height="24px" className="rounded-full"/>
                </div>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {Array.from({length: 8}).map((_, i) => (
                    <Skeleton key={i} variant="text" lines={i % 3 === 0 ? 1 : 2} width={i % 4 === 0 ? '70%' : '100%'}/>
                ))}
            </div>
        </div>
    );
}

export function SidebarSkeleton() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 border-b border-gray-700/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-10 p-3 space-y-3">
                <Skeleton variant="rectangular" height={44} width="100%" className="rounded-lg"/>
                <div className="flex items-center gap-2 overflow-hidden">
                    <Skeleton variant="rectangular" height={36} width="100%" className="rounded-lg flex-grow min-w-0"/>
                    <Skeleton variant="rectangular" height={36} width={100} className="rounded-lg"/>
                </div>
                <Skeleton variant="rectangular" height={36} width="100%" className="rounded-lg"/>
            </div>
            <div className="flex-grow px-2 py-3 overflow-y-auto custom-scrollbar">
                {Array.from({length: 12}).map((_, i) => (
                    <NoteItemSkeleton key={i}/>
                ))}
            </div>
        </div>
    );
}

export function MatchesPanelSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({length: 4}).map((_, i) => (
                <Skeleton key={i} variant="card" className="p-4 border border-gray-700/50 animate-fade-in">
                    <div className="flex items-start gap-3">
                        <Skeleton variant="circular" width={40} height={40} className="flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                            <Skeleton variant="text" width="70%" className="font-medium"/>
                            <Skeleton variant="text" width="50%" className="text-sm mt-1"/>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <Skeleton variant="text" width="70px" height="22px" className="rounded-full"/>
                                <Skeleton variant="text" width="70px" height="22px" className="rounded-full"/>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <Skeleton variant="text" width="50px" className="text-2xl font-bold text-green-400"/>
                            <Skeleton variant="text" width="80px" className="text-xs mt-1"/>
                        </div>
                    </div>
                </Skeleton>
            ))}
        </div>
    );
}

export function QuickActionsSkeleton() {
    return (
        <aside className="bg-gray-900/50 rounded-3xl border border-gray-700/30 p-6 flex flex-col gap-3 backdrop-blur-sm shadow-xl animate-fade-in">
            <Skeleton variant="text" width="30%" className="text-lg font-bold mb-2"/>
            {Array.from({length: 6}).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={60} width="100%" className="rounded-xl animate-fade-in" style={{animationDelay: `${i * 50}ms`}}/>
            ))}
        </aside>
    );
}

export function ActivityFeedSkeleton() {
    return (
        <div className="p-6 flex-1 space-y-4">
            {Array.from({length: 5}).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-fade-in" style={{animationDelay: `${i * 50}ms`}}>
                    <Skeleton variant="circular" width={8} height={8} className="flex-shrink-0 mt-1.5 bg-blue-500"/>
                    <div className="flex-1 min-w-0 space-y-1">
                        <Skeleton variant="text" width="80%" className="text-sm font-medium"/>
                        <Skeleton variant="text" width="60%" className="text-xs"/>
                        <Skeleton variant="text" width="40%" className="text-xs"/>
                    </div>
                </div>
            ))}
        </div>
    );
}