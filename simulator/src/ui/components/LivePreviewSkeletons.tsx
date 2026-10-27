import React from 'react';
import { cn } from '../utils';
import { Skeleton } from '../components/ui';
import { DesignTokens } from '../components/ui';

export const DashboardSkeleton = () => (
  <div className="w-full h-full flex flex-col">
    <div className={cn('p-4 border-b', DesignTokens.colors.border.muted, DesignTokens.colors.background.card)}>
      <Skeleton className="h-4 bg-gray-700 rounded w-1/4" />
    </div>
    <div className={cn('flex-1', DesignTokens.colors.background.primary)} />
  </div>
);

export const LogsSkeleton = () => (
  <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 bg-gray-800 rounded" />)}
  </div>
);