import React, {useRef, useImperativeHandle, forwardRef, useCallback, useState, useEffect, useMemo} from 'react';
import {cn} from '../../utils/ui';
import {Tooltip} from './Overlay';

export interface VirtualizedListProps<T> {
    items: T[];
    itemHeight: number | ((item: T, index: number) => number);
    containerHeight: number;
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
    keyboardNavigation?: boolean;
    collapsedTooltip?: (item: T, index: number) => React.ReactNode;
}

export interface VirtualizedListRef {
    scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void;
    scrollToTop: () => void;
    scrollToBottom: () => void;
    focusIndex: (index: number) => void;
}

interface VirtualizedItem<T> {
    item: T;
    index: number;
    key: string;
    style: React.CSSProperties;
}

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

    const [scrollTop, setScrollTop] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const itemHeightsRef = useRef<Map<number, number>>(new Map());
    const totalHeightRef = useRef(0);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [tooltipItem, setTooltipItem] = useState<{item: T; index: number} | null>(null);
    const previousSelectedKey = useRef<string | null | undefined>(undefined);

    const getHeight = useCallback((index: number): number => {
        if (typeof itemHeight === 'function') {
            const cached = itemHeightsRef.current.get(index);
            if (cached !== undefined) return cached;
            const height = itemHeight(items[index], index);
            itemHeightsRef.current.set(index, height);
            return height;
        }
        return itemHeight;
    }, [itemHeight, items]);

    const totalHeight = useMemo(() => {
        let height = 0;
        for (let i = 0; i < items.length; i++) {
            height += getHeight(i);
        }
        totalHeightRef.current = height;
        return height;
    }, [items, getHeight]);

    const {startIndex, endIndex, visibleItems} = useMemo(() => {
        let accumulatedHeight = 0;
        let start = 0;

        for (let i = 0; i < items.length; i++) {
            const h = getHeight(i);
            if (accumulatedHeight + h >= scrollTop - overscan * getHeight(i)) {
                start = Math.max(0, i - overscan);
                break;
            }
            accumulatedHeight += h;
        }

        let end = start;
        accumulatedHeight = 0;
        for (let i = 0; i < start; i++) {
            accumulatedHeight += getHeight(i);
        }

        for (let i = start; i < items.length; i++) {
            const h = getHeight(i);
            if (accumulatedHeight > containerHeight + overscan * h) break;
            accumulatedHeight += h;
            end = i;
        }

        end = Math.min(items.length - 1, end + overscan);

        const visible: VirtualizedItem<T>[] = [];
        let offsetTop = 0;
        for (let i = 0; i < start; i++) {
            offsetTop += getHeight(i);
        }

        for (let i = start; i <= end; i++) {
            const h = getHeight(i);
            visible.push({
                item: items[i],
                index: i,
                key: getItemKey(items[i], i),
                style: {
                    position: 'absolute',
                    top: offsetTop,
                    left: 0,
                    right: 0,
                    height: h,
                },
            });
            offsetTop += h;
        }

        return {startIndex: start, endIndex: end, visibleItems: visible};
    }, [items, scrollTop, containerHeight, getHeight, getItemKey, overscan]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);
        onScroll?.(newScrollTop);
    }, [onScroll]);

    const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
        if (!listRef.current) return;
        let offsetTop = 0;
        for (let i = 0; i < index; i++) {
            offsetTop += getHeight(i);
        }
        const itemH = getHeight(index);
        const containerH = containerHeight;

        let targetScrollTop = offsetTop;
        if (align === 'center') {
            targetScrollTop = offsetTop - (containerH - itemH) / 2;
        } else if (align === 'end') {
            targetScrollTop = offsetTop - containerH + itemH;
        }
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeightRef.current - containerH));

        listRef.current.scrollTop = targetScrollTop;
        setScrollTop(targetScrollTop);
    }, [getHeight, containerHeight]);

    const setListRef = useCallback((element: HTMLDivElement | null) => {
        listRef.current = element;
    }, []);

    const focusItem = useCallback((index: number) => {
        if (index >= 0 && index < items.length) {
            setFocusedIndex(index);
            scrollToIndex(index, 'center');
            requestAnimationFrame(() => {
                listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.focus();
            });
        }
    }, [items.length, scrollToIndex]);

    useEffect(() => {
        if (selectedKey === previousSelectedKey.current) return;
        previousSelectedKey.current = selectedKey;
        if (!selectedKey) return;
        const index = items.findIndex((item, itemIndex) => getItemKey(item, itemIndex) === selectedKey);
        if (index !== -1) {
            setFocusedIndex(index);
            scrollToIndex(index, 'center');
        }
    }, [selectedKey, items, getItemKey, scrollToIndex]);

    useImperativeHandle(ref, () => ({
        scrollToIndex,
        scrollToTop: () => scrollToIndex(0, 'start'),
        scrollToBottom: () => scrollToIndex(items.length - 1, 'end'),
        focusIndex: focusItem,
    }), [scrollToIndex, focusItem, items.length]);

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
        const h = typeof itemHeight === 'number' ? itemHeight : 72;
        return (
            <div
                ref={setListRef}
                className={cn('relative overflow-hidden', className)}
                style={{height: containerHeight}}
                role={role}
                aria-label={ariaLabel}
                aria-busy="true"
            >
                <div style={{height: totalHeight, position: 'relative'}}>
                    {Array.from({length: loadingCount}).map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse"
                            style={{
                                position: 'absolute',
                                top: i * h,
                                left: 0,
                                right: 0,
                                height: h,
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
                ref={setListRef}
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
        <>
            <div
                ref={setListRef}
                className={cn('relative overflow-auto', className)}
                style={{height: containerHeight}}
                onScroll={handleScroll}
                role={role}
                aria-label={ariaLabel}
                tabIndex={0}
                onKeyDown={handleKeyDown}
            >
                <div style={{height: totalHeight, position: 'relative', minHeight: containerHeight}}>
                    {visibleItems.map(({item, index, key, style}) => (
                        <div
                            key={key}
                            data-index={index}
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
                                    e.stopPropagation();
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