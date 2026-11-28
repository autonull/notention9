import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {cn} from '../../utils/ui';

/**
 * BaseList - Foundation for virtualized, selectable lists
 * 
 * Provides:
 * - Virtualized rendering for large datasets
 * - Single/multiple selection with keyboard navigation
 * - Row selection, focus management
 * - Infinite scroll support
 * - Custom row rendering
 * - ARIA attributes for accessibility
 * - Column-based layout support
 */

export interface ListItem<T> {
    id: string;
    data: T;
    /** Render function for the item */
    render?: (item: T, selected: boolean, focused: boolean) => React.ReactNode;
}

export interface BaseListProps<T> {
    /** Items to display */
    items: T[];
    /** Unique key extractor */
    getKey: (item: T) => string;
    /** Render function for each item */
    renderItem: (item: T, index: number, selected: boolean, focused: boolean) => React.ReactNode;
    /** Item height (for virtualization) */
    itemHeight?: number;
    /** Estimated item height if variable */
    estimatedItemHeight?: number;
    /** Selection mode */
    selectionMode?: 'none' | 'single' | 'multiple';
    /** Selected item IDs */
    selectedIds?: string[];
    /** Called when selection changes */
    onSelectionChange?: (selectedIds: string[]) => void;
    /** Focused item ID */
    focusedId?: string;
    /** Called when focus changes */
    onFocusChange?: (focusedId: string | null) => void;
    /** Enable virtualization (default: true for >50 items) */
    virtualize?: boolean;
    /** Overscan count for virtualization */
    overscan?: number;
    /** Empty state content */
    emptyContent?: React.ReactNode;
    /** Loading state */
    isLoading?: boolean;
    /** Load more callback (infinite scroll) */
    onLoadMore?: () => void;
    /** Has more items to load */
    hasMore?: boolean;
    /** Additional className */
    className?: string;
    /** List container className */
    containerClassName?: string;
    /** Item className */
    itemClassName?: string;
    /** Selected item className */
    selectedItemClassName?: string;
    /** Focused item className */
    focusedItemClassName?: string;
    /** ARIA label for the list */
    ariaLabel?: string;
    /** ARIA labelledby */
    ariaLabelledby?: string;
}

interface VirtualizedItem<T> {
    index: number;
    item: T;
    top: number;
    height: number;
}

function useVirtualization<T>(
    items: T[],
    itemHeight: number,
    containerHeight: number,
    overscan: number,
    scrollTop: number
): VirtualizedItem<T>[] {
    if (items.length === 0) return [];

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    const virtualItems: VirtualizedItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
        virtualItems.push({
            index: i,
            item: items[i],
            top: i * itemHeight,
            height: itemHeight,
        });
    }
    return virtualItems;
}

/**
 * BaseList component
 */
export function BaseList<T>({
    items,
    getKey,
    renderItem,
    itemHeight = 48,
    estimatedItemHeight,
    selectionMode = 'none',
    selectedIds = [],
    onSelectionChange,
    focusedId,
    onFocusChange,
    virtualize = true,
    overscan = 5,
    emptyContent,
    isLoading = false,
    onLoadMore,
    hasMore = false,
    className = '',
    containerClassName = '',
    itemClassName = '',
    selectedItemClassName = '',
    focusedItemClassName = '',
    ariaLabel = 'List',
    ariaLabelledby,
}: BaseListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [isVirtualized, setIsVirtualized] = useState(virtualize && items.length > 50);

    // Update virtualization decision when items change
    useEffect(() => {
        setIsVirtualized(virtualize && items.length > 50);
    }, [items.length, virtualize]);

    // Measure container height
    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollTop(target.scrollTop);

        // Infinite scroll detection
        if (onLoadMore && hasMore && !isLoading) {
            const {scrollTop, scrollHeight, clientHeight} = target;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                onLoadMore();
            }
        }
    }, [onLoadMore, hasMore, isLoading]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (selectionMode === 'none' || items.length === 0) return;

        let newFocusedId: string | null = focusedId ?? null;
        const currentIndex = focusedId ? items.findIndex(item => getKey(item) === focusedId) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                newFocusedId = getKey(items[Math.min(currentIndex + 1, items.length - 1)]);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newFocusedId = getKey(items[Math.max(currentIndex - 1, 0)]);
                break;
            case 'Home':
                e.preventDefault();
                newFocusedId = getKey(items[0]);
                break;
            case 'End':
                e.preventDefault();
                newFocusedId = getKey(items[items.length - 1]);
                break;
            case 'Enter':
            case ' ':
                if (focusedId) {
                    e.preventDefault();
                    const newSelected = selectedIds.includes(focusedId)
                        ? selectedIds.filter(id => id !== focusedId)
                        : selectionMode === 'single'
                            ? [focusedId]
                            : [...selectedIds, focusedId];
                    onSelectionChange?.(newSelected);
                }
                break;
            case 'Escape':
                e.preventDefault();
                onSelectionChange?.([]);
                onFocusChange?.(null);
                break;
        }

        if (newFocusedId !== focusedId) {
            onFocusChange?.(newFocusedId);
        }
    }, [items, getKey, selectionMode, selectedIds, focusedId, onSelectionChange, onFocusChange]);

    const handleItemClick = useCallback((item: T, e: React.MouseEvent) => {
        if (selectionMode === 'none') return;

        const key = getKey(item);
        const isSelected = selectedIds.includes(key);
        let newSelected: string[];

        if (e.ctrlKey || e.metaKey) {
            // Toggle selection
            newSelected = isSelected
                ? selectedIds.filter(id => id !== key)
                : [...selectedIds, key];
        } else if (e.shiftKey && focusedId) {
            // Range selection
            const startIndex = items.findIndex(item => getKey(item) === focusedId);
            const endIndex = items.findIndex(item => getKey(item) === key);
            const [min, max] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
            newSelected = items.slice(min, max + 1).map(getKey);
        } else {
            // Single selection
            newSelected = isSelected && selectionMode === 'multiple' ? [] : [key];
        }

        onSelectionChange?.(newSelected);
        onFocusChange?.(key);
    }, [items, getKey, selectionMode, selectedIds, focusedId, onSelectionChange, onFocusChange]);

    const handleItemFocus = useCallback((item: T) => {
        onFocusChange?.(getKey(item));
    }, [getKey, onFocusChange]);

    // Get virtualized items
    const virtualItems = useMemo(() => {
        if (!isVirtualized || items.length === 0) return null;
        return useVirtualization(items, itemHeight, containerHeight, overscan, scrollTop);
    }, [isVirtualized, items, itemHeight, containerHeight, overscan, scrollTop]);

    // Render items
    const renderItems = useMemo(() => {
        if (isVirtualized && virtualItems) {
            return (
                <div style={{height: items.length * itemHeight, position: 'relative'}}>
                    {virtualItems.map(({index, item, top, height}) => (
                        <div
                            key={getKey(item)}
                            style={{
                                position: 'absolute',
                                top,
                                height,
                                width: '100%',
                            }}
                        >
                            {renderListItem(item, index)}
                        </div>
                    ))}
                </div>
            );
        }

        return items.map((item, index) => renderListItem(item, index));
    }, [isVirtualized, virtualItems, items, itemHeight, getKey]);

    function renderListItem(item: T, index: number) {
        const key = getKey(item);
        const isSelected = selectedIds.includes(key);
        const isFocused = focusedId === key;

        return (
            <div
                key={key}
                tabIndex={0}
                role="option"
                aria-selected={isSelected}
                aria-label={`${ariaLabel} item ${index + 1} of ${items.length}`}
                className={cn(
                    'flex items-center px-3 py-2 transition-colors',
                    'cursor-pointer select-none',
                    itemClassName,
                    isSelected && `bg-[var(--app-accent-soft)] ${selectedItemClassName}`,
                    isFocused && `outline-none ring-2 ring-[var(--app-accent)] ${focusedItemClassName}`,
                    !isSelected && !isFocused && 'hover:bg-neutral-800/50'
                )}
                onClick={(e) => handleItemClick(item, e)}
                onFocus={() => handleItemFocus(item)}
                onKeyDown={handleKeyDown}
            >
                {renderItem(item, index, isSelected, isFocused)}
            </div>
        );
    }

    if (items.length === 0 && !isLoading) {
        return (
            <div
                ref={containerRef}
                className={cn(
                    'flex flex-col items-center justify-center py-12 text-center',
                    'bg-[var(--app-raised)] border border-[var(--app-line)] rounded-lg',
                    containerClassName,
                    className
                )}
                role="list"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
            >
                {emptyContent || (
                    <>
                        <div className="text-neutral-400 mb-2">No items found</div>
                        <div className="text-sm text-neutral-500">The list is currently empty</div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                'flex flex-col overflow-auto',
                'bg-[var(--app-raised)] border border-[var(--app-line)] rounded-lg',
                containerClassName,
                className
            )}
            role="listbox"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-multiselectable={selectionMode === 'multiple'}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
        >
            {renderItems}
            {isLoading && hasMore && (
                <div className="flex items-center justify-center p-4 border-t border-[var(--app-line)]">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--app-accent)] border-t-transparent" />
                    <span className="ml-2 text-sm text-neutral-400">Loading more...</span>
                </div>
            )}
            {hasMore && !isLoading && items.length > 0 && (
                <div className="flex items-center justify-center p-4 border-t border-[var(--app-line)]">
                    <button
                        onClick={onLoadMore}
                        className="text-sm text-[var(--app-accent)] hover:underline"
                    >
                        Load more
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Column-based list item renderer
 */
export interface Column<T> {
    key: string;
    header: string;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    render: (item: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
}

export interface ColumnListProps<T> extends Omit<BaseListProps<T>, 'renderItem'> {
    columns: Column<T>[];
    /** Show column headers */
    showHeaders?: boolean;
    /** Header className */
    headerClassName?: string;
    /** Cell className */
    cellClassName?: string;
}

export function ColumnList<T>({
    columns,
    showHeaders = true,
    headerClassName = '',
    cellClassName = '',
    ...props
}: ColumnListProps<T>) {
    const renderItem = useCallback((item: T, _index: number, selected: boolean, focused: boolean) => (
        <div className={cn('flex w-full', showHeaders ? 'items-center' : '')}>
            {columns.map(column => (
                <div
                    key={column.key}
                    className={cn(
                        'px-3 py-2 truncate',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        cellClassName
                    )}
                    style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                        flex: column.width ? '0 0 auto' : '1',
                    }}
                >
                    {column.render(item)}
                </div>
            ))}
        </div>
    ), [columns, showHeaders, cellClassName]);

    return (
        <div className="flex flex-col">
            {showHeaders && (
                <div
                    className={cn(
                        'flex px-3 py-2 border-b border-[var(--app-line)]',
                        'bg-neutral-800/50 font-medium text-xs text-neutral-400 uppercase tracking-wider',
                        headerClassName
                    )}
                    role="row"
                    aria-hidden={!showHeaders}
                >
                    {columns.map(column => (
                        <div
                            key={column.key}
                            className={cn(
                                'px-3 py-2 truncate',
                                column.align === 'center' && 'text-center',
                                column.align === 'right' && 'text-right'
                            )}
                            style={{
                                width: column.width,
                                minWidth: column.minWidth,
                                maxWidth: column.maxWidth,
                                flex: column.width ? '0 0 auto' : '1',
                            }}
                        >
                            {column.header}
                        </div>
                    ))}
                </div>
            )}
            <BaseList {...props} renderItem={renderItem} />
        </div>
    );
}