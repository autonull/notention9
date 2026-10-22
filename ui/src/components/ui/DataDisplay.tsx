import React from 'react';
import {cn} from '../../utils/ui';
import {Pagination} from './Navigation';

export interface TableColumn<T> {
    key: string;
    header: string;
    render?: (item: T, index: number) => React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
}

export interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    selectionMode?: 'none' | 'single' | 'multiple';
    selectedKeys?: Set<string>;
    onSelectionChange?: (keys: Set<string>) => void;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    loading?: boolean;
    emptyState?: React.ReactNode;
    className?: string;
    striped?: boolean;
    hoverable?: boolean;
    bordered?: boolean;
    compact?: boolean;
}

export function Table<T>({
    columns,
    data,
    keyExtractor,
    onRowClick,
    selectionMode = 'none',
    selectedKeys = new Set(),
    onSelectionChange,
    sortKey,
    sortDirection,
    onSort,
    loading = false,
    emptyState,
    className = '',
    striped = true,
    hoverable = true,
    bordered = false,
    compact = false,
}: TableProps<T>) {
    const handleSelectAll = () => {
        if (onSelectionChange) {
            if (selectedKeys.size === data.length) {
                onSelectionChange(new Set());
            } else {
                onSelectionChange(new Set(data.map(keyExtractor)));
            }
        }
    };

    const handleSelectRow = (key: string) => {
        if (onSelectionChange) {
            const newKeys = new Set(selectedKeys);
            if (newKeys.has(key)) {
                newKeys.delete(key);
            } else {
                newKeys.add(key);
            }
            onSelectionChange(newKeys);
        }
    };

    if (loading) {
        return (
            <div className={cn('overflow-x-auto', className)}>
                <table className="w-full" role="grid" aria-busy="true">
                    <thead className="bg-gray-800/50 border-b border-gray-700/50">
                        <tr>
                            {selectionMode === 'multiple' && (
                                <th className="px-4 py-3 text-left w-12">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                        checked={selectedKeys.size === data.length && data.length > 0}
                                        ref={(el) => { if (el) { el.indeterminate = selectedKeys.size > 0 && selectedKeys.size < data.length; } }}
                                        onChange={handleSelectAll}
                                        aria-label="Select all rows"
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider',
                                        col.align === 'center' && 'text-center',
                                        col.align === 'right' && 'text-right',
                                        col.sortable && 'cursor-pointer hover:text-white select-none'
                                    )}
                                    style={{width: col.width}}
                                    onClick={col.sortable ? () => onSort?.(col.key, sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc') : undefined}
                                    aria-sort={sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
                                            </svg>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({length: 5}).map((_, i) => (
                            <tr key={i} className={cn('animate-pulse', striped && i % 2 === 0 && 'bg-gray-800/30')}>
                                {selectionMode === 'multiple' && <td className="px-4 py-3 w-12"><div className="h-4 w-4 rounded border-gray-600 bg-gray-800"/></td>}
                                {columns.map((col) => (
                                    <td key={col.key} className={cn('px-4 py-3', col.align === 'center' && 'text-center', col.align === 'right' && 'text-right')}>
                                        <div className="h-4 bg-gray-800 rounded w-3/4" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className={cn('w-full', className)}>
                {emptyState || (
                    <div className="py-12 text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="text-gray-400">No data available</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full" role="grid">
                <thead className="bg-gray-800/50 border-b border-gray-700/50 sticky top-0 z-10">
                    <tr>
                        {selectionMode === 'multiple' && (
                            <th className="px-4 py-3 text-left w-12">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                    checked={selectedKeys.size === data.length && data.length > 0}
                                    ref={(el) => { if (el) { el.indeterminate = selectedKeys.size > 0 && selectedKeys.size < data.length; } }}
                                    onChange={handleSelectAll}
                                    aria-label="Select all rows"
                                />
                            </th>
                        )}
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    'px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider',
                                    col.align === 'center' && 'text-center',
                                    col.align === 'right' && 'text-right',
                                    col.sortable && 'cursor-pointer hover:text-white select-none'
                                )}
                                style={{width: col.width}}
                                onClick={col.sortable ? () => onSort?.(col.key, sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc') : undefined}
                                aria-sort={sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                                <div className="flex items-center gap-1">
                                    {col.header}
                                    {col.sortable && sortKey === col.key && (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}/>
                                        </svg>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                    {data.map((item, rowIndex) => {
                        const key = keyExtractor(item);
                        const isSelected = selectedKeys.has(key);
                        const isSortColumn = sortKey && columns.some(c => c.key === sortKey);

                        return (
                            <tr
                                key={key}
                                className={cn(
                                    'transition-colors duration-100',
                                    striped && rowIndex % 2 === 0 && 'bg-gray-800/30',
                                    hoverable && 'hover:bg-gray-800/50',
                                    onRowClick && 'cursor-pointer',
                                    isSelected && 'bg-blue-900/20',
                                    bordered && 'border-b border-gray-700/30',
                                    compact && 'py-2'
                                )}
                                onClick={onRowClick ? () => onRowClick(item) : undefined}
                                onDoubleClick={onRowClick ? () => onRowClick(item) : undefined}
                                tabIndex={onRowClick ? 0 : undefined}
                                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(item); }} : undefined}
                                aria-selected={selectionMode !== 'none' ? isSelected : undefined}
                            >
                                {selectionMode === 'multiple' && (
                                    <td className="px-4 py-3 w-12">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                                            checked={isSelected}
                                            onChange={() => handleSelectRow(key)}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`Select row ${rowIndex + 1}`}
                                        />
                                    </td>
                                )}
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn(
                                            'px-4 py-3 text-sm text-gray-300',
                                            col.align === 'center' && 'text-center',
                                            col.align === 'right' && 'text-right',
                                            compact && 'py-2'
                                        )}
                                    >
                                        {col.render ? col.render(item, rowIndex) : String((item as Record<string, unknown>)[col.key] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export interface ListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    keyExtractor: (item: T) => string;
    className?: string;
    separator?: boolean;
    striped?: boolean;
    hoverable?: boolean;
    emptyState?: React.ReactNode;
    loading?: boolean;
    loadingCount?: number;
}

export function List<T>({
    items,
    renderItem,
    keyExtractor,
    className = '',
    separator = true,
    striped = false,
    hoverable = true,
    emptyState,
    loading = false,
    loadingCount = 5,
}: ListProps<T>) {
    if (loading) {
        return (
            <div className={cn('space-y-3', className)} role="list" aria-busy="true">
                {Array.from({length: loadingCount}).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl bg-gray-800/50">
                        <div className="w-10 h-10 rounded-lg bg-gray-700" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-700 rounded w-1/3" />
                            <div className="h-3 bg-gray-700 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className={cn('w-full', className)}>
                {emptyState || (
                    <div className="py-12 text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                        </svg>
                        <p className="text-gray-400">No items found</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('space-y-0', className)} role="list">
            {items.map((item, index) => (
                <div
                    key={keyExtractor(item)}
                    className={cn(
                        'flex items-center gap-3 p-3 rounded-xl transition-colors duration-100',
                        separator && index > 0 && 'border-t border-gray-700/30',
                        striped && index % 2 === 0 && 'bg-gray-800/30',
                        hoverable && 'hover:bg-gray-800/50'
                    )}
                    role="listitem"
                >
                    {renderItem(item, index)}
                </div>
            ))}
        </div>
    );
}

export interface CardGridProps<T> {
    items: T[];
    renderCard: (item: T, index: number) => React.ReactNode;
    keyExtractor: (item: T) => string;
    columns?: 1 | 2 | 3 | 4 | 5;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
    emptyState?: React.ReactNode;
    loading?: boolean;
    loadingCount?: number;
}

export function CardGrid<T>({
    items,
    renderCard,
    keyExtractor,
    columns = 3,
    gap = 'md',
    className = '',
    emptyState,
    loading = false,
    loadingCount = 6,
}: CardGridProps<T>) {
    const columnClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    };

    const gapClasses = {
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
    };

    if (loading) {
        return (
            <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} role="list" aria-busy="true">
                {Array.from({length: loadingCount}).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 h-48" role="listitem" />
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className={cn('col-span-full', className)}>
                {emptyState || (
                    <div className="py-12 text-center col-span-full">
                        <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                        <p className="text-gray-400">No items to display</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)} role="list">
            {items.map((item, index) => (
                <article key={keyExtractor(item)} className="animate-fade-in" role="listitem">
                    {renderCard(item, index)}
                </article>
            ))}
        </div>
    );
}

export interface StatItemProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    trendLabel?: string;
    className?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function StatItem({
    label,
    value,
    icon,
    trend = 'neutral',
    trendValue,
    trendLabel,
    className = '',
    variant = 'default',
}: StatItemProps) {
    const variantColors = {
        default: 'text-gray-400',
        primary: 'text-blue-400',
        success: 'text-green-400',
        warning: 'text-yellow-400',
        error: 'text-red-400',
    };

    const trendColors = {
        up: 'text-green-400',
        down: 'text-red-400',
        neutral: 'text-gray-500',
    };

    const trendIcons = {
        up: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>,
        down: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7v-18"/></svg>,
        neutral: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14"/></svg>,
    };

    return (
        <div className={cn('bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4 md:p-6', className)}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-400 truncate">{label}</p>
                    <p className="mt-1 text-2xl md:text-3xl font-bold text-white truncate">{value}</p>
                    {(trendValue || trendLabel) && (
                        <div className={cn('mt-2 flex items-center gap-1.5', trendColors[trend])}>
                            {trendIcons[trend]}
                            {trendValue && <span className="text-sm font-semibold">{trendValue}</span>}
                            {trendLabel && <span className="text-sm">{trendLabel}</span>}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={cn('flex-shrink-0 p-3 rounded-xl', variantColors[variant])}>
                        <div className="w-6 h-6">{icon}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export interface DataTableProps<T> extends TableProps<T> {
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
        onPageSizeChange: (size: number) => void;
        pageSizeOptions?: number[];
    };
    toolbar?: React.ReactNode;
    rowActions?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    onRowClick,
    selectionMode = 'none',
    selectedKeys = new Set(),
    onSelectionChange,
    sortKey,
    sortDirection,
    onSort,
    loading = false,
    emptyState,
    className = '',
    striped = true,
    hoverable = true,
    bordered = false,
    compact = false,
    pagination,
    toolbar,
    rowActions,
}: DataTableProps<T>) {
    const allColumns = [...columns];
    if (rowActions) {
        allColumns.push({
            key: '__actions__',
            header: '',
            width: '120px',
            align: 'center' as const,
            render: (item: T) => (
                <div className="flex items-center justify-center">
                    {rowActions(item)}
                </div>
            ),
        });
    }

    return (
        <div className={cn('space-y-4', className)}>
            {toolbar && <div className="flex items-center justify-between flex-wrap gap-4">{toolbar}</div>}
            <Table
                columns={allColumns}
                data={data}
                keyExtractor={keyExtractor}
                onRowClick={onRowClick}
                selectionMode={selectionMode}
                selectedKeys={selectedKeys}
                onSelectionChange={onSelectionChange}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
                loading={loading}
                emptyState={emptyState}
                striped={striped}
                hoverable={hoverable}
                bordered={bordered}
                compact={compact}
            />
            {pagination && (
                <div className="flex items-center justify-between flex-wrap gap-4 px-2">
                    <div className="text-sm text-gray-400">
                        Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={pagination.pageSize}
                            onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {(pagination.pageSizeOptions || [10, 25, 50, 100]).map((size) => (
                                <option key={size} value={size}>{size} per page</option>
                            ))}
                        </select>
                        <Pagination
                            currentPage={pagination.page}
                            totalPages={Math.ceil(pagination.total / pagination.pageSize)}
                            onPageChange={pagination.onPageChange}
                            showFirstLast
                            showPrevNext
                        />
                    </div>
                </div>
            )}
        </div>
    );
}