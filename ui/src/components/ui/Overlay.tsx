import React, {useEffect, useRef} from 'react';
import {cn} from '../../utils/ui';

/** Traps focus within a container and restores the previous element on close. */
export function useFocusTrap(isActive: boolean, onEscape?: () => void) {
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isActive) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            // Focus the container after a brief delay to ensure it is mounted.
            setTimeout(() => contentRef.current?.focus(), 0);
        } else {
            previousActiveElement.current?.focus();
        }
        return () => {
            previousActiveElement.current?.focus();
        };
    }, [isActive]);

    useEffect(() => {
        if (!isActive) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onEscape?.();
            if (e.key === 'Tab') {
                const focusableElements = contentRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements?.length) {
                    const firstElement = focusableElements[0] as HTMLElement;
                    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isActive, onEscape]);

    return contentRef;
}

export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

export function Tooltip({content, children, position = 'top', delay = 200, className = ''}: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const childRef = useRef<HTMLElement>(null);

    const show = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hide = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const child = React.Children.only(children);
    const enhancedChild = React.cloneElement(child as React.ReactElement<any>, {
        ref: childRef as any,
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
    });

    const positionStyles = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowStyles = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--app-raised)]',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--app-raised)]',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--app-raised)]',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--app-raised)]',
    };

    return (
        <>
            {enhancedChild}
            {isVisible && (
                <div
                    className={cn(
                        'fixed z-[700] rounded-lg border border-[var(--app-line)] bg-[var(--app-raised)] px-3 py-1.5 text-xs text-[var(--app-text)]',
                        'shadow-[var(--app-shadow)] whitespace-nowrap animate-fade-in',
                        'pointer-events-none',
                        positionStyles[position],
                        className
                    )}
                    role="tooltip"
                >
                    {content}
                    <div
                        className={cn(
                            'absolute w-0 h-0 border-4 border-transparent',
                            arrowStyles[position]
                        )}
                    />
                </div>
            )}
        </>
    );
}
