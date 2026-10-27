import {useState, useCallback, useRef, useEffect} from 'react';
import {SIDEBAR_COLLAPSED_WIDTH} from '../constants/ui';

const SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 600;

export interface SidebarState {
    isOpen: boolean;
    isCollapsed: boolean;
    width: number;
    isResizing: boolean;
}

export interface UseSidebarStateOptions {
    initialWidth?: number;
    initialOpen?: boolean;
    isMobile?: boolean;
    onToggle?: () => void;
}

export function useSidebarState(options: UseSidebarStateOptions = {}) {
    const {
        initialWidth = SIDEBAR_WIDTH,
        initialOpen = true,
        isMobile = false,
        onToggle
    } = options;

    const [isOpen, setIsOpen] = useState(initialOpen);
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef({x: 0, width: initialWidth});

    const isCollapsed = !isOpen && width <= SIDEBAR_COLLAPSED_WIDTH;
    const effectiveWidth = isOpen ? width : 0;

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartRef.current = {x: e.clientX, width};
        const handleMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.min(
                Math.max(resizeStartRef.current.width - (moveEvent.clientX - resizeStartRef.current.x), SIDEBAR_COLLAPSED_WIDTH),
                MAX_SIDEBAR_WIDTH
            );
            setWidth(newWidth);
        };
        const handleEnd = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
        };
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }, [width]);

    const handleResizeKeyDown = useCallback((e: React.KeyboardEvent, currentWidth: number) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const newWidth = Math.min(
                Math.max(currentWidth + (e.key === 'ArrowRight' ? 20 : -20), SIDEBAR_COLLAPSED_WIDTH),
                MAX_SIDEBAR_WIDTH
            );
            setWidth(newWidth);
        }
    }, []);

    const toggleSidebar = useCallback(() => {
        if (isMobile) {
            setIsOpen(!isOpen);
            onToggle?.();
            return;
        }
        if (isOpen && width > SIDEBAR_COLLAPSED_WIDTH) {
            setWidth(SIDEBAR_COLLAPSED_WIDTH);
            setIsOpen(false);
        } else {
            setWidth(SIDEBAR_WIDTH);
            setIsOpen(true);
        }
        onToggle?.();
    }, [isMobile, isOpen, width, onToggle]);

    const openSidebar = useCallback(() => {
        if (!isOpen) {
            setWidth(SIDEBAR_WIDTH);
            setIsOpen(true);
        }
    }, [isOpen]);

    const closeSidebar = useCallback(() => {
        if (isOpen) {
            setWidth(SIDEBAR_COLLAPSED_WIDTH);
            setIsOpen(false);
        }
    }, [isOpen]);

    const resetToDefault = useCallback(() => {
        setWidth(SIDEBAR_WIDTH);
        setIsOpen(true);
    }, []);

    const sidebarClasses = (
        isMobile
            ? 'flex-shrink-0 bg-gray-900 border-r border-gray-700/50 transition-all duration-300 ease-in-out w-full block'
            : `flex-shrink-0 bg-gray-900 border-r border-gray-700/50 transition-all duration-300 ease-in-out block ${
                  isResizing ? 'select-none' : ''
              } ${!isOpen ? 'border-r-0 overflow-hidden' : ''}`
    );

    const style = isMobile ? undefined : {width: `${effectiveWidth}px`};

    return {
        isOpen,
        setIsOpen,
        isCollapsed,
        width,
        setWidth,
        isResizing,
        effectiveWidth,
        sidebarClasses,
        style,
        handleResizeStart,
        handleResizeKeyDown,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        resetToDefault,
        SIDEBAR_COLLAPSED_WIDTH,
        SIDEBAR_WIDTH,
        MAX_SIDEBAR_WIDTH,
    };
}

export {SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH, MAX_SIDEBAR_WIDTH};