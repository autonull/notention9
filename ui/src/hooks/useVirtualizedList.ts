import {useCallback, useMemo, useRef, useState, useEffect} from 'react';

export interface UseVirtualizedListOptions<T> {
    items: T[];
    itemHeight: number | ((item: T, index: number) => number);
    containerHeight: number;
    overscan?: number;
    getItemKey: (item: T, index: number) => string;
    onScroll?: (scrollTop: number) => void;
}

interface VirtualizedItem<T> {
    item: T;
    index: number;
    key: string;
    style: React.CSSProperties;
}

export function useVirtualizedList<T>({
    items,
    itemHeight,
    containerHeight,
    overscan = 5,
    getItemKey,
    onScroll
}: UseVirtualizedListOptions<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemHeightsRef = useRef<Map<number, number>>(new Map());
    const totalHeightRef = useRef(0);

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
        if (!containerRef.current) return;
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

        containerRef.current.scrollTop = targetScrollTop;
        setScrollTop(targetScrollTop);
    }, [getHeight, containerHeight]);

    const measureItem = useCallback((index: number, height: number) => {
        itemHeightsRef.current.set(index, height);
    }, []);

    return {
        containerRef,
        totalHeight,
        visibleItems,
        scrollTop,
        handleScroll,
        scrollToIndex,
        measureItem,
        startIndex,
        endIndex,
    };
}

export function useVirtualizedListAutoHeight<T>(
    items: T[],
    containerHeight: number,
    getItemKey: (item: T, index: number) => string,
    overscan = 5
) {
    const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
    const [defaultHeight, setDefaultHeight] = useState(72);

    const itemHeight = useCallback((item: T, index: number) => {
        return itemHeights.get(index) ?? defaultHeight;
    }, [itemHeights, defaultHeight]);

    const virtualized = useVirtualizedList({
        items,
        itemHeight,
        containerHeight,
        overscan,
        getItemKey,
    });

    const measureItem = useCallback((index: number, height: number) => {
        virtualized.measureItem(index, height);
        setItemHeights(prev => {
            const next = new Map(prev);
            next.set(index, height);
            if (height !== defaultHeight && itemHeights.size > 10) {
                const avg = Array.from(next.values()).reduce((a, b) => a + b, 0) / next.size;
                setDefaultHeight(Math.round(avg));
            }
            return next;
        });
    }, [virtualized, defaultHeight]);

    return {...virtualized, measureItem, defaultHeight};
}

