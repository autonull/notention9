import React, {useRef, useImperativeHandle, forwardRef, useCallback, useState} from 'react';
import {cn} from '../../utils/ui';
import {useVirtualizedList, UseVirtualizedListOptions} from '../../hooks/useVirtualizedList';
import {Tooltip} from './Overlay';

export interface VirtualizedListProps<T> extends Omit<UseVirtualizedListOptions<T>, 'getItemKey' | 'onScroll'> {
    children: (item: T, index: number, isSelected: boolean) => React.ReactNode;
    getItemKey: (item: T, index: number) => string;
    selectedKey?: string | null;
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
    /** Enable keyboard navigation (arrow keys, home, end) */
    keyboardNavigation?: boolean;
    /** Render function for tooltip when sidebar is collapsed */
    collapsedTooltip?: (item: T, index: number) => React.ReactNode;
}

export interface VirtualizedListRef {
    scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
    scrollToTop: () => void;
    scrollToBottom: () => void;
    focusIndex: (index: number) => void;
}

// Create a proper generic forwardRef component
function VirtualizedListInner<T>(
    props: VirtualizedListProps<T>,
    ref: React.Ref<VirtualizedListRef>
) {
    const {
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
        keyboardNavigation = true,
        collapsedTooltip,
    } = props;

    const virtualized = useVirtualizedList<T>({
            items,
            itemHeight,
            containerHeight,
            overscan,
            getItemKey,
            onScroll,
        });

        const listRef = useRef<HTMLDivElement>(null);
        const [focusedIndex, setFocusedIndex] = React.useState(-1);
        const [tooltipItem, setTooltipItem] = useState<{item: T; index: number} | null>(null);

        const focusItem = useCallback((index: number) => {
            if (index >= 0 && index < items.length) {
                setFocusedIndex(index);
                virtualized.scrollToIndex(index, 'center');
            }
        }, [items.length, virtualized]);

        useImperativeHandle(ref, () => ({
            scrollToIndex: virtualized.scrollToIndex,
            scrollToTop: () => virtualized.scrollToIndex(0, 'start'),
            scrollToBottom: () => virtualized.scrollToIndex(items.length - 1, 'end'),
            focusIndex: focusItem,
        }), [virtualized, focusItem]);

        const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
            if (!keyboardNavigation || items.length === 0) return;

            let newIndex = focusedIndex;
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + 1, items.length - 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = Math.max(focusedIndex - 1, 0);
                    break;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = items.length - 1;
                    break;
                case 'PageDown':
                    e.preventDefault();
                    newIndex = Math.min(focusedIndex + 10, items.length - 1);
                    break;
                case 'PageUp':
                    e.preventDefault();
                    newIndex = Math.max(focusedIndex - 10, 0);
                    break;
                case 'Enter':
                case ' ':
                    if (focusedIndex >= 0 && onItemClick) {
                        e.preventDefault();
                        onItemClick(items[focusedIndex], focusedIndex);
                    }
                    return;
                default:
                    return;
            }
            focusItem(newIndex);
        }, [focusedIndex, items, keyboardNavigation, onItemClick, focusItem]);

        if (loading) {
            return (
                <div
                    ref={listRef}
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
                    ref={listRef}
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

        // Sync focusedIndex with selectedKey
        React.useEffect(() => {
            if (selectedKey) {
                const index = items.findIndex(item => getItemKey(item, 0) === selectedKey);
                if (index !== -1 && index !== focusedIndex) {
                    setFocusedIndex(index);
                }
            }
        }, [selectedKey, items, getItemKey, focusedIndex]);

        return (
            <>
                <div
                    ref={listRef}
                    className={cn('relative overflow-auto', className)}
                    style={{height: containerHeight}}
                    onScroll={virtualized.handleScroll}
                    role={role}
                    aria-label={ariaLabel}
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
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
                                tabIndex={index === focusedIndex ? 0 : -1}
                                onFocus={() => setFocusedIndex(index)}
                                onMouseEnter={() => collapsedTooltip && setTooltipItem({item, index})}
                                onMouseLeave={() => setTooltipItem(null)}
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
                {collapsedTooltip && tooltipItem && (
                    <Tooltip
                        content={collapsedTooltip(tooltipItem.item, tooltipItem.index)}
                        position="right"
                        className="z-50"
                    >
                        <div className="invisible fixed inset-0 pointer-events-none" />
                    </Tooltip>
                )}
            </>
        );
    }

export const VirtualizedList = forwardRef<VirtualizedListRef, VirtualizedListProps<any>>(
    (props, ref) => VirtualizedListInner(props as VirtualizedListProps<any>, ref)
);

VirtualizedList.displayName = 'VirtualizedList';