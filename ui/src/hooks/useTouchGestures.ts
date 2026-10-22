import {useCallback, useEffect, useRef, useState} from 'react';

interface TouchPoint {
    x: number;
    y: number;
    time: number;
}

interface SwipeDirection {
    direction: 'left' | 'right' | 'up' | 'down' | null;
    distance: number;
    velocity: number;
}

interface UseTouchGesturesOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onPullToRefresh?: () => Promise<void>;
    onLongPress?: () => void;
    onTap?: () => void;
    onDoubleTap?: () => void;
    swipeThreshold?: number;
    velocityThreshold?: number;
    longPressDelay?: number;
    doubleTapDelay?: number;
    pullToRefreshThreshold?: number;
    disabled?: boolean;
}

export function useTouchGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPullToRefresh,
    onLongPress,
    onTap,
    onDoubleTap,
    swipeThreshold = 50,
    velocityThreshold = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pullToRefreshThreshold = 80,
    disabled = false,
}: UseTouchGesturesOptions) {
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const touchStartRef = useRef<TouchPoint | null>(null);
    const touchCurrentRef = useRef<TouchPoint | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTapTimeRef = useRef<number>(0);
    const tapCountRef = useRef<number>(0);
    const isLongPressTriggeredRef = useRef(false);
    const elementRef = useRef<HTMLElement | null>(null);
    const isScrollingRef = useRef(false);
    const startScrollTopRef = useRef(0);

    const cleanup = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        touchStartRef.current = null;
        touchCurrentRef.current = null;
        isLongPressTriggeredRef.current = false;
        isScrollingRef.current = false;
    }, []);

    const getSwipeDirection = useCallback((): SwipeDirection => {
        const start = touchStartRef.current;
        const current = touchCurrentRef.current;
        if (!start || !current) return {direction: null, distance: 0, velocity: 0};

        const dx = current.x - start.x;
        const dy = current.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeDelta = current.time - start.time;
        const velocity = timeDelta > 0 ? distance / timeDelta : 0;

        if (distance < swipeThreshold || velocity < velocityThreshold) {
            return {direction: null, distance, velocity};
        }

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy) {
            return {
                direction: dx > 0 ? 'right' : 'left',
                distance: absDx,
                velocity,
            };
        } else {
            return {
                direction: dy > 0 ? 'down' : 'up',
                distance: absDy,
                velocity,
            };
        }
    }, [swipeThreshold, velocityThreshold]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (disabled) return;

        const touch = e.touches[0];
        const now = Date.now();

        touchStartRef.current = {x: touch.clientX, y: touch.clientY, time: now};
        touchCurrentRef.current = {...touchStartRef.current};
        isLongPressTriggeredRef.current = false;

        const element = elementRef.current;
        if (element) {
            startScrollTopRef.current = element.scrollTop;
        }

        if (onLongPress) {
            longPressTimerRef.current = setTimeout(() => {
                isLongPressTriggeredRef.current = true;
                onLongPress();
            }, longPressDelay);
        }

        if (onPullToRefresh && element && element.scrollTop === 0) {
            isScrollingRef.current = true;
        }
    }, [disabled, onLongPress, longPressDelay, onPullToRefresh]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (disabled || !touchStartRef.current) return;

        const touch = e.touches[0];
        touchCurrentRef.current = {x: touch.clientX, y: touch.clientY, time: Date.now()};

        const element = elementRef.current;
        const {direction, distance} = getSwipeDirection();

        if (onPullToRefresh && element && !isRefreshing) {
            if (element.scrollTop <= 0 && direction === 'down' && !isLongPressTriggeredRef.current) {
                e.preventDefault();
                const pullDist = Math.min(distance * 0.5, pullToRefreshThreshold * 1.5);
                setPullDistance(pullDist);
                setIsPulling(true);

                if (pullDist >= pullToRefreshThreshold) {
                    element.style.transform = `translateY(${pullDist}px)`;
                }
            } else if (isPulling && (direction !== 'down' || element.scrollTop > 0)) {
                setIsPulling(false);
                setPullDistance(0);
                if (element) {
                    element.style.transform = '';
                }
            }
        }

        if (isLongPressTriggeredRef.current) {
            return;
        }

        if (distance > 10) {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }
    }, [disabled, getSwipeDirection, onPullToRefresh, pullToRefreshThreshold, isRefreshing]);

    const handleTouchEnd = useCallback(async (e: TouchEvent) => {
        if (disabled) return;

        const element = elementRef.current;
        const {direction, distance, velocity} = getSwipeDirection();
        const now = Date.now();

        if (isPulling && onPullToRefresh && pullDistance >= pullToRefreshThreshold) {
            setIsRefreshing(true);
            setIsPulling(false);
            if (element) {
                element.style.transform = '';
                element.style.transition = 'transform 0.3s ease-out';
            }

            try {
                await onPullToRefresh();
            } finally {
                setIsRefreshing(false);
                if (element) {
                    element.style.transition = '';
                }
            }
            cleanup();
            return;
        }

        if (isPulling) {
            setIsPulling(false);
            setPullDistance(0);
            if (element) {
                element.style.transform = '';
                element.style.transition = 'transform 0.3s ease-out';
                setTimeout(() => {
                    if (element) element.style.transition = '';
                }, 300);
            }
        }

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (isLongPressTriggeredRef.current) {
            cleanup();
            return;
        }

        const timeSinceLastTap = now - lastTapTimeRef.current;
        if (timeSinceLastTap < doubleTapDelay) {
            tapCountRef.current++;
        } else {
            tapCountRef.current = 1;
        }
        lastTapTimeRef.current = now;

        if (tapCountRef.current === 2) {
            if (onDoubleTap) {
                onDoubleTap();
            }
            tapCountRef.current = 0;
            cleanup();
            return;
        }

        if (direction && distance >= swipeThreshold && velocity >= velocityThreshold) {
            switch (direction) {
                case 'left': onSwipeLeft?.(); break;
                case 'right': onSwipeRight?.(); break;
                case 'up': onSwipeUp?.(); break;
                case 'down': onSwipeDown?.(); break;
            }
            cleanup();
            return;
        }

        if (distance < 10 && timeSinceLastTap > doubleTapDelay) {
            setTimeout(() => {
                if (tapCountRef.current === 1 && onTap) {
                    onTap();
                }
                tapCountRef.current = 0;
            }, doubleTapDelay);
        }

        cleanup();
    }, [
        disabled,
        getSwipeDirection,
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        onPullToRefresh,
        onDoubleTap,
        onTap,
        swipeThreshold,
        velocityThreshold,
        pullDistance,
        isPulling,
        doubleTapDelay,
        cleanup,
    ]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart, {passive: !onPullToRefresh});
        element.addEventListener('touchmove', handleTouchMove, {passive: !onPullToRefresh});
        element.addEventListener('touchend', handleTouchEnd, {passive: true});
        element.addEventListener('touchcancel', cleanup, {passive: true});

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', cleanup);
            cleanup();
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, cleanup, onPullToRefresh]);

    return {
        ref: elementRef,
        isPulling,
        pullDistance,
        isRefreshing,
        pullProgress: Math.min(pullDistance / pullToRefreshThreshold, 1),
    };
}

interface SwipeActionItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'primary';
    backgroundColor?: string;
}

interface UseSwipeActionsOptions {
    leftActions?: SwipeActionItem[];
    rightActions?: SwipeActionItem[];
    threshold?: number;
    onActionClick?: (actionId: string) => void;
}

export function useSwipeActions({
    leftActions = [],
    rightActions = [],
    threshold = 80,
    onActionClick,
}: UseSwipeActionsOptions) {
    const [offset, setOffset] = useState(0);
    const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
    const elementRef = useRef<HTMLElement | null>(null);
    const startXRef = useRef(0);
    const isDraggingRef = useRef(false);

    const actionsWidth = Math.max(
        leftActions.length * 60,
        rightActions.length * 60
    );

    const handleTouchStart = useCallback((e: TouchEvent) => {
        startXRef.current = e.touches[0].clientX;
        isDraggingRef.current = true;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDraggingRef.current) return;

        const deltaX = e.touches[0].clientX - startXRef.current;
        let newOffset = 0;

        if (deltaX > 0 && leftActions.length > 0) {
            newOffset = Math.min(deltaX, actionsWidth);
            setActiveSide('left');
        } else if (deltaX < 0 && rightActions.length > 0) {
            newOffset = Math.max(deltaX, -actionsWidth);
            setActiveSide('right');
        } else {
            newOffset = 0;
            setActiveSide(null);
        }

        setOffset(newOffset);
        if (elementRef.current) {
            elementRef.current.style.transform = `translateX(${newOffset}px)`;
        }
    }, [leftActions.length, rightActions.length, actionsWidth]);

    const handleTouchEnd = useCallback(() => {
        isDraggingRef.current = false;

        if (Math.abs(offset) >= threshold && activeSide) {
            setOffset(activeSide === 'left' ? actionsWidth : -actionsWidth);
            if (elementRef.current) {
                elementRef.current.style.transform = `translateX(${activeSide === 'left' ? actionsWidth : -actionsWidth}px)`;
            }
        } else {
            setOffset(0);
            setActiveSide(null);
            if (elementRef.current) {
                elementRef.current.style.transform = '';
            }
        }
    }, [offset, activeSide, actionsWidth, threshold]);

    const handleActionClick = useCallback((action: SwipeActionItem) => {
        action.onClick();
        onActionClick?.(action.id);
        setOffset(0);
        setActiveSide(null);
        if (elementRef.current) {
            elementRef.current.style.transform = '';
        }
    }, [onActionClick]);

    const close = useCallback(() => {
        setOffset(0);
        setActiveSide(null);
        if (elementRef.current) {
            elementRef.current.style.transform = '';
        }
    }, []);

    return {
        ref: elementRef,
        offset,
        activeSide,
        isOpen: activeSide !== null,
        leftActions,
        rightActions,
        actionsWidth,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleActionClick,
        close,
        style: {transform: `translateX(${offset}px)`, transition: 'transform 0.2s ease-out'} as React.CSSProperties,
    };
}

export function useGestureNavigation(
    onBack?: () => void,
    onForward?: () => void,
    threshold = 60
) {
    const [isNavigating, setIsNavigating] = useState<'back' | 'forward' | null>(null);
    const startXRef = useRef(0);
    const elementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        let startX = 0;
        let isTracking = false;

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            isTracking = startX < 30 || startX > window.innerWidth - 30;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isTracking || e.touches.length !== 1) return;

            const currentX = e.touches[0].clientX;
            const delta = currentX - startX;

            if ((startX < 30 && delta > 0) || (startX > window.innerWidth - 30 && delta < 0)) {
                const progress = Math.min(Math.abs(delta) / threshold, 1);
                setIsNavigating(startX < 30 ? 'back' : 'forward');
                element.style.transform = `translateX(${delta * 0.3}px)`;
                element.style.opacity = `${1 - progress * 0.3}`;
            }
        };

        const handleTouchEnd = () => {
            if (!isTracking) return;

            const endX = startXRef.current;
            const delta = endX - startX;

            if (Math.abs(delta) > threshold) {
                if (startX < 30 && delta > 0 && onBack) {
                    onBack();
                } else if (startX > window.innerWidth - 30 && delta < 0 && onForward) {
                    onForward();
                }
            }

            element.style.transform = '';
            element.style.opacity = '';
            setIsNavigating(null);
            isTracking = false;
        };

        element.addEventListener('touchstart', handleTouchStart, {passive: true});
        element.addEventListener('touchmove', handleTouchMove, {passive: true});
        element.addEventListener('touchend', handleTouchEnd, {passive: true});

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onBack, onForward, threshold]);

    return {ref: elementRef, isNavigating};
}