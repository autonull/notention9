import React, {useState, useRef, useEffect} from 'react';
import {cn} from '../../utils/ui';
import {ChevronDownIcon} from './icons';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    onToggle?: (open: boolean) => void;
    className?: string;
    titleClassName?: string;
    contentClassName?: string;
}

export function CollapsibleSection({
    title,
    icon,
    children,
    defaultOpen = true,
    onToggle,
    className = '',
    titleClassName = '',
    contentClassName = '',
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
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
    };

    return (
        <div className={cn('overflow-hidden transition-all duration-200', className)}>
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                    'hover:bg-gray-800/50',
                    titleClassName
                )}
                aria-expanded={isOpen}
                aria-controls={`${title.replace(/\s+/g, '-').toLowerCase()}-content`}
            >
                {icon && <span className="flex-shrink-0 w-5 h-5 text-gray-300" aria-hidden="true">{icon}</span>}
                <span className="flex-1 font-medium text-gray-100">{title}</span>
                <ChevronDownIcon
                    className={cn(
                        'flex-shrink-0 w-5 h-5 text-gray-400 transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                />
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