import React, {useEffect, useRef} from 'react';
import {cn} from '../../utils/ui';
import {Modal as ModalPrimitive, ModalProps} from './Primitives';

export {ModalPrimitive as Modal};

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    description?: string;
    position?: 'left' | 'right' | 'top' | 'bottom';
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    className?: string;
}

export function Drawer({
    isOpen,
    onClose,
    children,
    title,
    description,
    position = 'right',
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    className = '',
}: DrawerProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';
            contentRef.current?.focus();
        } else {
            document.body.style.overflow = '';
            previousActiveElement.current?.focus();
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
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
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeStyles = {
        sm: 'w-64 sm:w-80',
        md: 'w-80 sm:w-96',
        lg: 'w-96 sm:w-[32rem]',
        xl: 'w-[36rem] sm:w-[42rem]',
        full: 'w-full sm:max-w-2xl',
    };

    const positionStyles = {
        left: 'left-0 top-0 h-full',
        right: 'right-0 top-0 h-full',
        top: 'top-0 left-0 w-full',
        bottom: 'bottom-0 left-0 w-full',
    };

    const animateStyles = {
        left: 'animate-slide-in-left',
        right: 'animate-slide-in-right',
        top: 'animate-slide-in-down',
        bottom: 'animate-slide-in-up',
    };

    return (
        <div className="fixed inset-0 z-[500] flex" role="dialog" aria-modal="true" aria-labelledby={title ? 'drawer-title' : undefined} aria-describedby={description ? 'drawer-description' : undefined}>
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={contentRef}
                tabIndex={-1}
                className={cn(
                    'relative flex flex-col bg-gray-900 border border-gray-700/50 shadow-2xl',
                    'overflow-hidden flex-shrink-0',
                    sizeStyles[size],
                    positionStyles[position],
                    animateStyles[position],
                    className
                )}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between p-4 md:p-6 border-b border-gray-700/50 flex-shrink-0">
                        <div>
                            {title && <h2 id="drawer-title" className="text-lg font-semibold text-white">{title}</h2>}
                            {description && <p id="drawer-description" className="mt-1 text-sm text-gray-400">{description}</p>}
                        </div>
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

export interface PopoverProps {
    isOpen: boolean;
    onClose: () => void;
    trigger: React.ReactElement;
    content: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
    offset?: number;
    className?: string;
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
}

export function Popover({
    isOpen,
    onClose,
    trigger,
    content,
    position = 'bottom',
    offset = 8,
    className = '',
    closeOnClickOutside = true,
    closeOnEscape = true,
}: PopoverProps) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape' && closeOnEscape) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

    useEffect(() => {
        if (!isOpen || !triggerRef.current || !contentRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = 0;
        let left = 0;

        const positions = position.split('-');
        const mainPos = positions[0];
        const align = positions[1] || 'center';

        switch (mainPos) {
            case 'top':
                top = triggerRect.top - contentRect.height - offset;
                if (align === 'start') left = triggerRect.left;
                else if (align === 'end') left = triggerRect.right - contentRect.width;
                else left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
                break;
            case 'bottom':
                top = triggerRect.bottom + offset;
                if (align === 'start') left = triggerRect.left;
                else if (align === 'end') left = triggerRect.right - contentRect.width;
                else left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
                break;
            case 'left':
                left = triggerRect.left - contentRect.width - offset;
                if (align === 'start') top = triggerRect.top;
                else if (align === 'end') top = triggerRect.bottom - contentRect.height;
                else top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
                break;
            case 'right':
                left = triggerRect.right + offset;
                if (align === 'start') top = triggerRect.top;
                else if (align === 'end') top = triggerRect.bottom - contentRect.height;
                else top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
                break;
        }

        // Keep within viewport
        left = Math.max(8, Math.min(left, viewportWidth - contentRect.width - 8));
        top = Math.max(8, Math.min(top, viewportHeight - contentRect.height - 8));

        contentRef.current.style.top = `${top}px`;
        contentRef.current.style.left = `${left}px`;
    }, [isOpen, position, offset]);

    if (!isOpen) return trigger;

    return (
        <>
            <div ref={triggerRef} className="inline-block">{trigger}</div>
            <div
                ref={contentRef}
                className={cn(
                    'fixed z-[600] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl',
                    'animate-scale-in',
                    'max-w-xs w-auto p-2',
                    className
                )}
                style={{position: 'fixed', top: 0, left: 0}}
                role="dialog"
                aria-label="Popover"
            >
                {content}
            </div>
        </>
    );
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
        top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
    };

    return (
        <>
            {enhancedChild}
            {isVisible && (
                <div
                    className={cn(
                        'fixed z-[700] px-3 py-1.5 bg-gray-800 text-gray-100 text-xs',
                        'rounded-lg shadow-xl whitespace-nowrap animate-fade-in',
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

export interface DropdownProps {
    trigger: React.ReactElement;
    items: Array<{
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
        shortcut?: string;
        disabled?: boolean;
        danger?: boolean;
        divider?: boolean;
    }>;
    align?: 'start' | 'end';
    className?: string;
}

export function Dropdown({trigger, items, align = 'start', className = ''}: DropdownProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (triggerRef.current?.contains(e.target as Node)) return;
            if (dropdownRef.current?.contains(e.target as Node)) return;
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleTriggerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const enhancedTrigger = React.cloneElement(trigger as React.ReactElement<any>, {
        onClick: handleTriggerClick,
        'aria-haspopup': 'true',
        'aria-expanded': isOpen,
    });

    return (
        <div className="relative inline-block" ref={triggerRef}>
            {enhancedTrigger}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className={cn(
                        'fixed z-[600] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl',
                        'animate-scale-in min-w-[180px] py-1',
                        align === 'end' ? 'right-0' : 'left-0',
                        'top-full mt-1.5',
                        className
                    )}
                    role="menu"
                >
                    {items.map((item, index) =>
                        item.divider ? (
                            <hr key={`divider-${index}`} className="my-1 border-gray-700/50" role="separator" />
                        ) : (
                            <button
                                key={item.label}
                                onClick={() => {
                                    item.onClick();
                                    setIsOpen(false);
                                }}
                                disabled={item.disabled}
                                className={cn(
                                    'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                                    'text-gray-300 hover:bg-gray-800 hover:text-white',
                                    'disabled:opacity-40 disabled:cursor-not-allowed',
                                    item.danger && 'text-red-400 hover:bg-red-900/30'
                                )}
                                role="menuitem"
                                aria-disabled={item.disabled}
                            >
                                {item.icon && <span className="w-4 h-4 flex-shrink-0" aria-hidden="true">{item.icon}</span>}
                                <span className="flex-1">{item.label}</span>
                                {item.shortcut && <span className="text-xs text-gray-500 font-mono">{item.shortcut}</span>}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}

export interface CommandPaletteItem {
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    shortcut?: string;
    action: () => void;
    category?: string;
    keywords?: string[];
}

const DEFAULT_SHORTCUTS = [
    {label: 'New Note', keys: ['Ctrl', 'N']},
    {label: 'Command Palette', keys: ['Ctrl', 'K']},
    {label: 'Search Notes', keys: ['Ctrl', 'F']},
    {label: 'Toggle Sidebar', keys: ['Ctrl', '\\']},
    {label: 'Save Note', keys: ['Ctrl', 'S']},
    {label: 'Next Note', keys: ['Ctrl', 'J']},
    {label: 'Previous Note', keys: ['Ctrl', 'K']},
    {label: 'Back to List', keys: ['Esc']},
    {label: 'Open Help', keys: ['?']},
];

export interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    items: CommandPaletteItem[];
    placeholder?: string;
    title?: string;
    className?: string;
}

export function CommandPalette({
    isOpen,
    onClose,
    items,
    placeholder = 'Type a command or search...',
    title,
    className = '',
}: CommandPaletteProps) {
    const [query, setQuery] = React.useState('');
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredItems = React.useMemo(() => {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.keywords?.some(k => k.toLowerCase().includes(q)) ||
            item.shortcut?.toLowerCase().includes(q)
        );
    }, [items, query]);

    React.useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    React.useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    filteredItems[selectedIndex].action();
                    onClose();
                }
                break;
            case 'Escape':
                onClose();
                break;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className={cn('bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[60vh] animate-slide-in-up', className)} onClick={(e) => e.stopPropagation()}>
                {(title || placeholder) && (
                    <div className="flex items-center p-4 border-b border-gray-700/50">
                        {title && <h3 className="font-semibold text-white">{title}</h3>}
                        <div className="relative flex-1 mx-4">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-transparent pl-10 pr-4 py-2 text-lg text-white placeholder-gray-500 focus:outline-none"
                                placeholder={placeholder}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-700 px-1.5 rounded">Esc</kbd>
                        </div>
                    </div>
                )}
                <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                    {filteredItems.length === 0 && query && (
                        <div className="p-8 text-center text-gray-500">No results found for "{query}"</div>
                    )}
                    {filteredItems.length === 0 && !query && (
                        <div className="p-4 space-y-4">
                            <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Keyboard Shortcuts
                            </div>
                            <div className="space-y-2 px-3">
                                {DEFAULT_SHORTCUTS.map((shortcut) => (
                                    <div key={shortcut.keys.join('+')} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/50 transition-colors">
                                        <span className="text-sm text-gray-300">{shortcut.label}</span>
                                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded uppercase tracking-wider">
                                            {shortcut.keys.join(' + ')}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {filteredItems.map((item, index) => {
                        const showCategory = item.category && (index === 0 || filteredItems[index - 1].category !== item.category);
                        return (
                            <React.Fragment key={item.id}>
                                {showCategory && (
                                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {item.category}
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        item.action();
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={cn(
                                        'w-full flex items-center p-3 rounded-lg transition-colors',
                                        index === selectedIndex ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-700/50'
                                    )}
                                >
                                    <div className={cn('mr-4 flex-shrink-0 w-5 h-5', index === selectedIndex ? 'text-blue-400' : 'text-gray-400')}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className={cn('font-medium truncate', index === selectedIndex ? 'text-white' : 'text-gray-200')}>
                                            {item.label}
                                        </div>
                                        {item.description && (
                                            <div className={cn('text-sm truncate', index === selectedIndex ? 'text-blue-200' : 'text-gray-500')}>
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                    {item.shortcut && (
                                        <kbd className={cn('ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider', index === selectedIndex ? 'bg-blue-500/30 text-blue-200' : 'bg-gray-700 text-gray-500')}>
                                            {item.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className="p-2 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between px-4 py-2 bg-gray-900/30">
                    <span>↑↓ navigate · ↵ select · Esc close</span>
                </div>
            </div>
        </div>
    );
}

export interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary' | 'warning';
    loading?: boolean;
}

export function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    loading = false,
}: ConfirmationDialogProps) {
    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700',
        primary: 'bg-blue-600 hover:bg-blue-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
    };

    return (
        <ModalPrimitive
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            showCloseButton={false}
        >
            <div className="space-y-4">
                <p className="text-gray-300">{message}</p>
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={cn('px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors', variantStyles[variant])}
                    >
                        {loading ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </ModalPrimitive>
    );
}