import React from 'react';
import {cn} from '../../utils/ui';

interface SidebarPullToRefreshProps {
    isMobile: boolean;
    isPulling: boolean;
    pullDistance: number;
    pullProgress: number;
    refreshUserLocation: () => Promise<void>;
}

export function SidebarPullToRefresh({isMobile, isPulling, pullDistance, pullProgress, refreshUserLocation}: SidebarPullToRefreshProps) {
    if (!isMobile || !isPulling) return null;

    return (
        <div className="pull-to-refresh flex items-center justify-center px-4 py-3 text-sm" style={{height: Math.max(60, pullDistance)}}>
            <div className="flex flex-col items-center gap-2 transition-all duration-200">
                <div className={cn(
                    'w-8 h-8 border-2 rounded-full transition-all duration-200 flex items-center justify-center',
                    pullProgress >= 1
                        ? 'border-blue-500 animate-spin'
                        : 'border-gray-600'
                )} style={{transform: `rotate(${pullProgress * 360}deg)`}}>
                    {pullProgress >= 1 ? (
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{transform: `rotate(${-90 + pullProgress * 90}deg)`}}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    )}
                </div>
                <span className={cn('transition-colors duration-200', pullProgress >= 1 ? 'text-blue-400 font-medium' : 'text-gray-500')}>
                    {pullProgress >= 1 ? 'Refreshing...' : pullProgress > 0.5 ? 'Release to refresh' : 'Pull to refresh'}
                </span>
                <div className="w-32 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-100 ease-out" style={{width: `${pullProgress * 100}%`}}/>
                </div>
            </div>
        </div>
    );
}