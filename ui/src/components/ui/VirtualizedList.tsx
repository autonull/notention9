import React, {useRef, useImperativeHandle, forwardRef} from 'react';
import {cn} from '../../utils/ui';
import {useVirtualizedList, UseVirtualizedListOptions} from '../../hooks/useVirtualizedList';

export interface VirtualizedListProps<T> extends Omit<UseVirtualizedListOptions<T>, 'getItemKey' | 'onScroll'> {
    children: (item: T, index: number, isSelected?: boolean) => React.ReactNode;
    getItemKey: (item: T, index: number) => string;
    selectedKey?: string;
    onItemClick?: (item: T, index: number) => void;
    onItemDoubleClick?: (item: T, index: number) => void;
    className?: string;
    role?: 'list' | 'listbox' | 'tree' | 'grid';
    'aria-label'?: string;
    emptyState?: React.ReactNode;
    loading?: boolean;
    loadingCount?: number;
    onScroll?: (scrollTop: number) => void;
    overscan?: number;
}

export interface VirtualizedListRef {
    scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
    scrollToTop: () => void;
    scrollToBottom: () => void;
}

export function VirtualizedList<T>({
    items,
    itemHeight = 72,
    containerHeight = 400,
    children,
    getItemKey,
    selectedKey,
    onItemClick,
    onItemDoubleClick,
    className = '',
    role = 'list',
    'aria-label': ariaLabel,
    emptyState,
    loading = false,
    loadingCount = 5,
    onScroll,
    overscan = 5,
}: VirtualizedListProps<T>) {
    const virtualized = useVirtualizedList<T>({
        items,
        itemHeight,
        containerHeight,
        overscan,
        getItemKey,
        onScroll,
    });

    const listRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(listRef, () => ({
        scrollToIndex: virtualized.scrollToIndex,
        scrollToTop: () => virtualized.scrollToIndex(0, 'start'),
        scrollToBottom: () => virtualized.scrollToIndex(items.length - 1, 'end'),
    }));

    if (loading) {
        return (
            <div
                ref={listRef as React.RefObject<HTMLDivElement>}
                className={cn('relative overflow-hidden', className)}
                style={{height: containerHeight}}
                role={role}
                aria-label={ariaLabel}
                aria-busy="true"
            >
                <div style={{height: virtualized.totalHeight, position: 'relative'}}>
                    {Array.from({length: loadingCount}).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse"
                            style={{
                                position: 'absolute',
                                top: i * (typeof itemHeight === 'number' ? itemHeight : 72),
                                left: 0,
                                right: 0,
                                height: typeof itemHeight === 'number' ? itemHeight : 72,
                            }}
                        >
                            <div className="h-full w-full bg-gray-800/50 rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div
                ref={listRef as React.RefObject<HTMLDivElement>}
                className={cn('relative overflow-hidden flex items-center justify-center', className)}
                style={{height: containerHeight}}
                role={role}
                aria-label={ariaLabel}
            >
                {emptyState || (
                    <div className="text-center text-gray-500 p-8">
                        <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p>No items found</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            ref={listRef as React.RefObject<HTMLDivElement>}
            className={cn('relative overflow-auto', className)}
            style={{height: containerHeight}}
            onScroll={virtualized.handleScroll}
            role={role}
            aria-label={ariaLabel}
            tabIndex={0}
        >
            <div style={{height: virtualized.totalHeight, position: 'relative', minHeight: containerHeight}}>
                {virtualized.visibleItems.map(({item, index, key, style}) => (
                    <div
                        key={key}
                        style={style}
                        className="w-full"
                        onClick={() => onItemClick?.(item, index)}
                        onDoubleClick={() => onItemDoubleClick?.(item, index)}
                        role={role === 'list' ? 'listitem' : role === 'listbox' ? 'option' : undefined}
                        aria-selected={selectedKey === getItemKey(item, index)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && onItemClick) {
                                e.preventDefault();
                                onItemClick(item, index);
                            }
                        }}
                    >
                        {children(item, index, selectedKey === getItemKey(item, index))}
                    </div>
                ))}
            </div>
        </div>
    );
}

VirtualizedList.displayName = 'VirtualizedList';