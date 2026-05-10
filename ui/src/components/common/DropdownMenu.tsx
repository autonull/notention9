import React, {useState, useRef, useEffect} from 'react';

export interface DropdownMenuItem {
    label: string;
    icon?: React.FC<any>;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
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
                    className={`
                        absolute z-[100] mt-2 w-48 rounded-md bg-gray-800 border border-gray-700 shadow-xl py-1
                        ${align === 'right' ? 'right-0' : 'left-0'}
                        animate-in fade-in zoom-in-95 duration-100
                    `}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => !item.disabled && handleItemClick(item.onClick)}
                            disabled={item.disabled}
                            className={`
                                w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                                ${item.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-700'}
                                ${item.variant === 'danger' ? 'text-red-400 hover:bg-red-900/20' : 'text-gray-200'}
                            `}
                        >
                            {item.icon && <item.icon className="h-4 w-4"/>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
