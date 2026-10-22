import React from 'react';
import {cn} from '../../utils/ui';

export interface TabProps {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
    disabled?: boolean;
    badge?: React.ReactNode;
}

export interface TabsProps {
    tabs: TabProps[];
    activeTab: string;
    onChange: (id: string) => void;
    variant?: 'default' | 'pills' | 'underline' | 'segmented';
    className?: string;
    fullWidth?: boolean;
    orientation?: 'horizontal' | 'vertical';
}

export function Tabs({
    tabs,
    activeTab,
    onChange,
    variant = 'default',
    className = '',
    fullWidth = false,
    orientation = 'horizontal',
}: TabsProps) {
    const variantStyles = {
        default: {
            container: 'bg-gray-800/50 p-1 rounded-xl border border-gray-700/50',
            tab: 'data-[state=active]:bg-white/5 data-[state=active]:text-white data-[state=active]:shadow-sm',
            base: 'px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-all duration-150',
        },
        pills: {
            container: 'flex gap-1',
            tab: 'data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg',
            base: 'px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-all duration-150',
        },
        underline: {
            container: 'border-b border-gray-700/50',
            tab: 'data-[state=active]:text-blue-400 data-[state=active]:border-blue-500',
            base: 'px-4 py-3 border-b-2 border-transparent text-sm font-medium text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all duration-150',
        },
        segmented: {
            container: 'bg-gray-800 p-1 rounded-xl border border-gray-700/50',
            tab: 'data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-sm',
            base: 'px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 transition-all duration-150',
        },
    };

    const style = variantStyles[variant];

    return (
        <div
            role="tablist"
            aria-orientation={orientation}
            className={cn(
                'flex items-center',
                orientation === 'vertical' ? 'flex-col' : 'flex-row',
                fullWidth && 'w-full',
                style.container,
                className
            )}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    id={`${tab.id}-tab`}
                    onClick={() => !tab.disabled && onChange(tab.id)}
                    disabled={tab.disabled}
                    className={cn(
                        style.base,
                        style.tab,
                        tab.disabled && 'opacity-40 cursor-not-allowed',
                        fullWidth && 'flex-1',
                        orientation === 'vertical' && 'w-full justify-start',
                        tab.icon ? 'flex items-center gap-2' : undefined,
                    )}
                >
                    {tab.icon && <span className="flex-shrink-0 w-4 h-4" aria-hidden="true">{tab.icon}</span>}
                    <span>{tab.label}</span>
                    {(tab.count !== undefined || tab.badge) && (
                        <span className={cn(
                            'ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded-full',
                            activeTab === tab.id
                                ? variant === 'pills' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
                                : 'bg-gray-700 text-gray-300'
                        )}>
                            {tab.badge || tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

export interface TabPanelProps {
    id: string;
    activeTab: string;
    children: React.ReactNode;
    className?: string;
}

export function TabPanel({id, activeTab, children, className = ''}: TabPanelProps) {
    if (activeTab !== id) return null;

    return (
        <div
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={`${id}-tab`}
            className={cn('animate-fade-in', className)}
        >
            {children}
        </div>
    );
}

export interface BreadcrumbProps {
    items: Array<{
        label: string;
        href?: string;
        onClick?: () => void;
        icon?: React.ReactNode;
        current?: boolean;
    }>;
    separator?: React.ReactNode;
    className?: string;
    maxItems?: number;
}

export function Breadcrumb({
    items,
    separator = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>,
    className = '',
    maxItems = 5,
}: BreadcrumbProps) {
    const visibleItems = items.length > maxItems
        ? [items[0], {label: '...', current: false}, ...items.slice(-maxItems + 2)]
        : items;

    return (
        <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 flex-wrap">
                {visibleItems.map((item, index) => (
                    <li key={item.label} className="flex items-center gap-1">
                        {index > 0 && (
                            <span className="text-gray-500 flex-shrink-0" aria-hidden="true">
                                {separator}
                            </span>
                        )}
                        {item.href || item.onClick ? (
                            <button
                                onClick={item.onClick}
                                className={cn(
                                    'flex items-center gap-1 text-gray-400 hover:text-white transition-colors',
                                    'px-2 py-1 rounded-lg',
                                    item.current && 'text-white font-medium'
                                )}
                                aria-current={item.current ? 'page' : undefined}
                            >
                                {item.icon && <span className="w-3 h-3" aria-hidden="true">{item.icon}</span>}
                                <span>{item.label}</span>
                            </button>
                        ) : (
                            <span className={cn(
                                'flex items-center gap-1 text-gray-500',
                                'px-2 py-1',
                                item.current && 'text-white font-medium'
                            )} aria-current={item.current ? 'page' : undefined}>
                                {item.icon && <span className="w-3 h-3" aria-hidden="true">{item.icon}</span>}
                                <span>{item.label}</span>
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    showFirstLast?: boolean;
    showPrevNext?: boolean;
    maxVisiblePages?: number;
    className?: string;
    ariaLabel?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    showFirstLast = true,
    showPrevNext = true,
    maxVisiblePages = 5,
    className = '',
    ariaLabel = 'Pagination',
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
        start = Math.max(1, end - maxVisiblePages + 1);
    }

    if (showFirstLast && start > 1) {
        pages.push(1);
        if (start > 2) pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (showFirstLast && end < totalPages) {
        if (end < totalPages - 1) pages.push('ellipsis');
        pages.push(totalPages);
    }

    return (
        <nav className={cn('flex items-center gap-1', className)} aria-label={ariaLabel}>
            {showPrevNext && (
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                    aria-disabled={currentPage === 1}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                </button>
            )}

            <div className="flex items-center gap-1" role="group" aria-label="Pages">
                {pages.map((page, index) =>
                    page === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500" aria-hidden="true">…</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
                                'min-w-[2.5rem]',
                                currentPage === page
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            )}
                            aria-label={`Page ${page}`}
                            aria-current={currentPage === page ? 'page' : undefined}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>

            {showPrevNext && (
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                    aria-disabled={currentPage === totalPages}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                </button>
            )}
        </nav>
    );
}

export interface StepperProps {
    steps: Array<{
        label: string;
        description?: string;
        icon?: React.ReactNode;
        status?: 'pending' | 'current' | 'completed' | 'error';
    }>;
    currentStep: number;
    onStepClick?: (index: number) => void;
    className?: string;
    orientation?: 'horizontal' | 'vertical';
}

export function Stepper({
    steps,
    currentStep,
    onStepClick,
    className = '',
    orientation = 'horizontal',
}: StepperProps) {
    return (
        <div className={cn('flex', orientation === 'vertical' ? 'flex-col' : 'flex-row', className)} role="navigation" aria-label="Step progress">
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isError = step.status === 'error';

                return (
                    <div key={step.label} className="flex flex-1 relative">
                        <button
                            onClick={() => onStepClick?.(index)}
                            disabled={!onStepClick}
                            className={cn(
                                'flex flex-col items-center gap-2 relative z-10',
                                onStepClick ? 'cursor-pointer' : 'cursor-default'
                            )}
                            aria-current={isActive ? 'step' : undefined}
                            aria-disabled={!onStepClick}
                        >
                            <div className={cn(
                                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                                'flex-shrink-0',
                                isError ? 'border-red-500 bg-red-900/30 text-red-400' :
                                isCompleted ? 'border-green-500 bg-green-500 text-white' :
                                isActive ? 'border-blue-500 bg-blue-500 text-white' :
                                'border-gray-600 bg-gray-800 text-gray-500'
                            )}>
                                {isCompleted && !isError ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                    </svg>
                                ) : step.icon ? (
                                    <span className="w-5 h-5" aria-hidden="true">{step.icon}</span>
                                ) : (
                                    <span className="text-sm font-bold">{index + 1}</span>
                                )}
                            </div>
                            <div className="text-center min-w-0">
                                <p className={cn(
                                    'text-sm font-medium truncate',
                                    isError ? 'text-red-400' :
                                    isCompleted ? 'text-green-400' :
                                    isActive ? 'text-blue-400' :
                                    'text-gray-400'
                                )}>
                                    {step.label}
                                </p>
                                {step.description && (
                                    <p className={cn(
                                        'text-xs truncate mt-0.5',
                                        isError ? 'text-red-500' :
                                        isCompleted ? 'text-green-500' :
                                        isActive ? 'text-blue-500' :
                                        'text-gray-500'
                                    )}>
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </button>
                        {!isLast && (
                            <div className={cn(
                                'absolute top-5 left-1/2 w-full h-0.5',
                                orientation === 'vertical' && 'top-1/2 left-5 w-0.5 h-full',
                                isCompleted ? 'bg-green-500' : 'bg-gray-700'
                            )} aria-hidden="true" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export interface NavItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
}

export interface NavProps {
    items: NavItem[];
    onSelect?: (id: string) => void;
    variant?: 'sidebar' | 'tabs' | 'pills';
    className?: string;
    orientation?: 'vertical' | 'horizontal';
}

export function Nav({items, onSelect, variant = 'sidebar', className = '', orientation = 'vertical'}: NavProps) {
    const variantStyles = {
        sidebar: {
            item: 'px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-150 flex items-center gap-3',
            active: 'bg-blue-900/30 text-blue-400 border-l-2 border-blue-500',
            badge: 'ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-900/50 text-blue-300',
        },
        tabs: {
            item: 'px-4 py-3 border-b-2 border-transparent text-sm font-medium text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all duration-150',
            active: 'text-blue-400 border-blue-500',
            badge: 'ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-900/50 text-blue-300',
        },
        pills: {
            item: 'px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition-all duration-150',
            active: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20',
            badge: 'ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-white/20 text-white',
        },
    };

    const style = variantStyles[variant];

    return (
        <nav className={cn('flex', orientation === 'vertical' ? 'flex-col' : 'flex-row', 'gap-1', className)} role="navigation" aria-label="Navigation">
            {items.map((item) => (
                <button
                    key={item.id}
                    onClick={() => !item.disabled && (item.onClick?.() || onSelect?.(item.id))}
                    disabled={item.disabled}
                    className={cn(
                        style.item,
                        item.active && style.active,
                        item.disabled && 'opacity-40 cursor-not-allowed',
                        item.href && 'cursor-pointer'
                    )}
                    aria-current={item.active ? 'page' : undefined}
                    aria-disabled={item.disabled}
                >
                    {item.icon && <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">{item.icon}</span>}
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.badge !== undefined && (
                        <span className={style.badge}>{item.badge}</span>
                    )}
                </button>
            ))}
        </nav>
    );
}