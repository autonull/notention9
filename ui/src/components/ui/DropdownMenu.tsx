import React, {useState, useRef, useEffect} from 'react';

export interface DropdownMenuItem {
    label: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'danger';
}

export interface DropdownMenuProps {
    trigger: React.ReactNode;
    items: DropdownMenuItem[];
    align?: 'left' | 'right';
    className?: string;
}

export function DropdownMenu({trigger, items, align = 'right', className = ''}: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setIsOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen]);

    const handleItemClick = (onClick: () => void) => {
        onClick();
        setIsOpen(false);
    };

    return (
        <div className={`relative inline-block ${className}`} ref={containerRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    role="menu"
                    className={`
                        absolute z-[100] mt-2 w-48 overflow-hidden rounded-lg border border-[var(--app-line)] bg-[var(--app-panel)] py-1 shadow-[var(--app-shadow)]
                        ${align === 'right' ? 'right-0' : 'left-0'}
                        animate-in fade-in zoom-in-95 duration-100
                    `}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            type="button"
                            role="menuitem"
                            onClick={() => !item.disabled && handleItemClick(item.onClick)}
                            disabled={item.disabled}
                            className={`
                                flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors
                                ${item.disabled ? 'cursor-not-allowed opacity-30' : 'hover:bg-[var(--app-hover)]'}
                                ${item.variant === 'danger' ? 'text-[var(--color-error)] hover:bg-red-500/10' : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'}
                            `}
                        >
                            {item.icon && <item.icon className="h-4 w-4 shrink-0"/>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}