import React, {useState, useRef, useEffect, useCallback} from 'react';
import {cn} from '../../utils/ui';

/**
 * BasePanel - Foundation for resizable, collapsible panels
 * 
 * Provides:
 * - Resizable panes with drag handles
 * - Collapsible sections with animated height
 * - Keyboard accessible (arrows, Home, End)
 * - Persisted state (localStorage optional)
 * - ARIA attributes for accessibility
 * - Multiple panes support
 */

export type PanelOrientation = 'horizontal' | 'vertical';
export type PanelEdge = 'start' | 'end';

export interface PaneConfig {
    /** Unique identifier for the pane */
    id: string;
    /** Initial size (percentage for horizontal, pixels for vertical) */
    defaultSize: number;
    /** Minimum size */
    minSize?: number;
    /** Maximum size */
    maxSize?: number;
    /** Whether pane is collapsible */
    collapsible?: boolean;
    /** Label for accessibility */
    label: string;
    /** Pane content */
    children: React.ReactNode;
}

export interface BasePanelProps {
    /** Pane configurations */
    panes: PaneConfig[];
    /** Layout orientation */
    orientation?: PanelOrientation;
    /** Gap between panes */
    gap?: number;
    /** Persist sizes to localStorage */
    persistKey?: string;
    /** Called when pane sizes change */
    onSizesChange?: (sizes: Record<string, number>) => void;
    /** Additional className */
    className?: string;
    /** Show resize handles */
    showHandles?: boolean;
    /** Handle width */
    handleWidth?: number;
    /** Disable all resizing */
    disabled?: boolean;
}

interface PaneState {
    size: number;
    collapsed: boolean;
    previousSize: number;
}

/**
 * Hook for managing panel state
 */
function usePanelState(panes: PaneConfig[], persistKey?: string): [
    Record<string, PaneState>,
    React.Dispatch<React.SetStateAction<Record<string, PaneState>>>
] {
    const [state, setState] = useState<Record<string, PaneState>>(() => {
        const initial: Record<string, PaneState> = {};
        
        // Try to restore from localStorage
        if (persistKey && typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(persistKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    panes.forEach(pane => {
                        initial[pane.id] = {
                            size: parsed[pane.id]?.size ?? pane.defaultSize,
                            collapsed: parsed[pane.id]?.collapsed ?? false,
                            previousSize: parsed[pane.id]?.size ?? pane.defaultSize,
                        };
                    });
                    return initial;
                }
            } catch {
                // Ignore parse errors
            }
        }

        panes.forEach(pane => {
            initial[pane.id] = {
                size: pane.defaultSize,
                collapsed: false,
                previousSize: pane.defaultSize,
            };
        });
        return initial;
    });

    // Persist to localStorage
    useEffect(() => {
        if (persistKey && typeof window !== 'undefined') {
            const toSave: Record<string, {size: number; collapsed: boolean}> = {};
            Object.entries(state).forEach(([id, paneState]) => {
                toSave[id] = {size: paneState.size, collapsed: paneState.collapsed};
            });
            localStorage.setItem(persistKey, JSON.stringify(toSave));
        }
    }, [state, persistKey]);

    return [state, setState];
}

/**
 * Hook for handling pane resize
 */
function usePaneResize(
    panes: PaneConfig[],
    state: Record<string, PaneState>,
    setState: React.Dispatch<React.SetStateAction<Record<string, PaneState>>>,
    orientation: PanelOrientation,
    onSizesChange?: (sizes: Record<string, number>) => void
) {
    const dragRef = useRef<{paneId: string; startPos: number; startSize: number} | null>(null);

    const clampSize = useCallback((paneId: string, size: number) => {
        const pane = panes.find(p => p.id === paneId);
        if (!pane) return size;
        return Math.min(pane.maxSize ?? Infinity, Math.max(pane.minSize ?? 0, size));
    }, [panes]);

    const startDrag = useCallback((paneId: string, clientX: number, clientY: number) => {
        const paneState = state[paneId];
        if (!paneState || paneState.collapsed) return;
        
        dragRef.current = {
            paneId,
            startPos: orientation === 'horizontal' ? clientX : clientY,
            startSize: paneState.size,
        };
    }, [state, orientation]);

    const handleDrag = useCallback((clientX: number, clientY: number) => {
        if (!dragRef.current) return;
        
        const {paneId, startPos, startSize} = dragRef.current;
        const delta = orientation === 'horizontal' 
            ? clientX - startPos 
            : clientY - startPos;
        
        const paneIndex = panes.findIndex(p => p.id === paneId);
        if (paneIndex === -1) return;

        const pane = panes[paneIndex];
        const newSize = clampSize(paneId, startSize + delta);
        
        if (newSize !== state[paneId]?.size) {
            setState(prev => ({
                ...prev,
                [paneId]: {...prev[paneId], size: newSize},
            }));
        }
    }, [panes, orientation, state, clampSize, setState]);

    const endDrag = useCallback(() => {
        if (dragRef.current) {
            dragRef.current = null;
            // Notify parent of size changes
            if (onSizesChange) {
                const sizes: Record<string, number> = {};
                Object.entries(state).forEach(([id, paneState]) => {
                    sizes[id] = paneState.size;
                });
                onSizesChange(sizes);
            }
        }
    }, [state, onSizesChange]);

    return {startDrag, handleDrag, endDrag};
}

/**
 * BasePanel component
 */
export function BasePanel({
    panes,
    orientation = 'horizontal',
    gap = 0,
    persistKey,
    onSizesChange,
    className = '',
    showHandles = true,
    handleWidth = 8,
    disabled = false,
}: BasePanelProps) {
    const [state, setState] = usePanelState(panes, persistKey);
    const {startDrag, handleDrag, endDrag} = usePaneResize(panes, state, setState, orientation, onSizesChange);

    const containerRef = useRef<HTMLDivElement>(null);

    // Handle pointer events for dragging
    useEffect(() => {
        const handleMove = (e: PointerEvent) => handleDrag(e.clientX, e.clientY);
        const handleUp = () => endDrag();

        if (dragRef.current) {
            containerRef.current?.setPointerCapture(dragRef.current.paneId as any);
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp);
        }
        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [handleDrag, endDrag]);

    const dragRef = useRef<{paneId: string; startPos: number; startSize: number} | null>(null);

    const handlePointerDown = (e: React.PointerEvent, paneId: string) => {
        if (disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        startDrag(paneId, e.clientX, e.clientY);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (dragRef.current) {
            handleDrag(e.clientX, e.clientY);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (dragRef.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        endDrag();
    };

    const handleDoubleClick = (paneId: string) => {
        const pane = panes.find(p => p.id === paneId);
        const paneState = state[paneId];
        if (!pane || !pane.collapsible || !paneState) return;
        
        setState(prev => {
            if (prev[paneId]?.collapsed) {
                return {
                    ...prev,
                    [paneId]: {...prev[paneId]!, collapsed: false, size: prev[paneId]!.previousSize},
                };
            } else {
                return {
                    ...prev,
                    [paneId]: {...prev[paneId]!, collapsed: true, previousSize: prev[paneId]!.size, size: 0},
                };
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent, paneId: string) => {
        const paneState = state[paneId];
        if (!paneState || paneState.collapsed) return;

        const pane = panes.find(p => p.id === paneId);
        if (!pane) return;

        const step = 1; // 1% for horizontal, 10px for vertical
        let delta = 0;

        if (orientation === 'horizontal') {
            if (e.key === 'ArrowLeft') delta = -step;
            else if (e.key === 'ArrowRight') delta = step;
            else if (e.key === 'Home') delta = pane.minSize ? pane.minSize - paneState.size : -paneState.size;
            else if (e.key === 'End') delta = (pane.maxSize ?? 100) - paneState.size;
        } else {
            if (e.key === 'ArrowUp') delta = -10;
            else if (e.key === 'ArrowDown') delta = 10;
            else if (e.key === 'Home') delta = (pane.minSize ?? 0) - paneState.size;
            else if (e.key === 'End') delta = (pane.maxSize ?? 100) - paneState.size;
        }

        if (delta !== 0) {
            e.preventDefault();
            const newSize = Math.min(pane.maxSize ?? Infinity, Math.max(pane.minSize ?? 0, paneState.size + delta));
            if (newSize !== paneState.size) {
                setState(prev => ({
                    ...prev,
                    [paneId]: {...prev[paneId], size: newSize},
                }));
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative',
                orientation === 'horizontal' ? 'flex flex-row' : 'flex flex-col',
                gap > 0 && `gap-${gap}`,
                className
            )}
            role="group"
            aria-label={persistKey ? `Panel group: ${persistKey}` : 'Resizable panel group'}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={endDrag}
        >
            {panes.map((pane, index) => {
                const paneState = state[pane.id];
                const isCollapsed = paneState?.collapsed ?? false;
                const size = isCollapsed ? 0 : (paneState?.size ?? pane.defaultSize);
                const isLast = index === panes.length - 1;

                return (
                    <React.Fragment key={pane.id}>
                        <div
                            className={cn(
                                'relative flex-1 overflow-hidden bg-[var(--app-raised)] border border-[var(--app-line)] rounded-lg',
                                isCollapsed ? 'w-0 h-0 min-w-0 min-h-0' : '',
                                orientation === 'horizontal' ? 'flex flex-col' : 'flex flex-row'
                            )}
                            style={{
                                flexBasis: orientation === 'horizontal' ? `${size}%` : `${size}px`,
                                minWidth: orientation === 'horizontal' ? `${pane.minSize ?? 0}%` : undefined,
                                maxWidth: orientation === 'horizontal' ? `${pane.maxSize ?? 100}%` : undefined,
                                minHeight: orientation === 'vertical' ? `${pane.minSize ?? 0}px` : undefined,
                                maxHeight: orientation === 'vertical' ? `${pane.maxSize ?? 100}px` : undefined,
                            }}
                            role="region"
                            aria-label={pane.label}
                            aria-orientation={orientation}
                        >
                            {pane.children}
                        </div>
                        {!isLast && showHandles && !disabled && (
                            <div
                                role="separator"
                                aria-orientation={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
                                aria-label={pane.label}
                                aria-valuemin={pane.minSize ?? 0}
                                aria-valuemax={pane.maxSize ?? (orientation === 'horizontal' ? 100 : 1000)}
                                aria-valuenow={paneState?.size ?? pane.defaultSize}
                                tabIndex={0}
                                onPointerDown={(e) => handlePointerDown(e, pane.id)}
                                onKeyDown={(e) => handleKeyDown(e, pane.id)}
                                onDoubleClick={() => handleDoubleClick(pane.id)}
                                className={cn(
                                    'relative z-10 shrink-0 cursor-col-resize touch-none',
                                    orientation === 'horizontal' ? 'w-[8px]' : 'h-[8px]',
                                    'bg-transparent focus:outline-none focus-visible:bg-[var(--app-accent-soft)]',
                                    'transition-colors group-hover:bg-[var(--app-line)]'
                                )}
                                style={{width: handleWidth, height: handleWidth}}
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'absolute inset-0 flex items-center justify-center',
                                        orientation === 'horizontal' ? 'w-px' : 'h-px',
                                        'bg-[var(--app-line)] transition-colors group-hover:bg-[var(--app-line-strong)] group-focus-visible:bg-[var(--app-accent-line)]'
                                    )}
                                />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

/**
 * CollapsiblePanel - Single collapsible section
 */
export interface CollapsiblePanelProps {
    /** Section title */
    title: string;
    /** Section content */
    children: React.ReactNode;
    /** Icon to show next to title */
    icon?: React.ReactNode;
    /** Default open state */
    defaultOpen?: boolean;
    /** Called when toggle state changes */
    onToggle?: (open: boolean) => void;
    /** Additional className */
    className?: string;
    /** Title className */
    titleClassName?: string;
    /** Content className */
    contentClassName?: string;
    /** Persist open state to localStorage */
    persistKey?: string;
}

export function CollapsiblePanel({
    title,
    children,
    icon,
    defaultOpen = true,
    onToggle,
    className = '',
    titleClassName = '',
    contentClassName = '',
    persistKey,
}: CollapsiblePanelProps) {
    const [isOpen, setIsOpen] = useState(() => {
        if (persistKey && typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(persistKey);
                if (saved !== null) return JSON.parse(saved);
            } catch {}
        }
        return defaultOpen;
    });

    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | 'auto'>('auto');

    useEffect(() => {
        if (contentRef.current) {
            setHeight(isOpen ? contentRef.current.scrollHeight : 0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleResize = () => {
            if (contentRef.current) {
                setHeight(contentRef.current.scrollHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen]);

    const handleToggle = () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        onToggle?.(nextOpen);
        if (persistKey && typeof window !== 'undefined') {
            localStorage.setItem(persistKey, JSON.stringify(nextOpen));
        }
    };

    return (
        <div className={cn('overflow-hidden transition-all duration-200', className)}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-neutral-800/50',
                    titleClassName
                )}
                aria-expanded={isOpen}
                aria-controls={`${title.replace(/\s+/g, '-').toLowerCase()}-content`}
                id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}
            >
                {icon && <span className="flex-shrink-0 w-5 h-5 text-neutral-300" aria-hidden="true">{icon}</span>}
                <span className="flex-1 font-medium text-neutral-100">{title}</span>
                <svg
                    className={cn(
                        'flex-shrink-0 w-5 h-5 text-neutral-400 transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            <div
                id={`${title.replace(/\s+/g, '-').toLowerCase()}-content`}
                ref={contentRef}
                className={cn('overflow-hidden transition-[height] duration-200 ease-out', contentClassName)}
                style={{height: isOpen ? height : 0}}
                role="region"
                aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}
            >
                <div className="pt-2">{children}</div>
            </div>
        </div>
    );
}