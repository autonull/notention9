import React from 'react';
import {cn} from '../../utils/ui';

export interface PageLayoutProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    sidebar?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    sidebarWidth?: string;
    headerHeight?: string;
}

export function PageLayout({
    children,
    header,
    sidebar,
    footer,
    className = '',
    sidebarWidth = 'w-80',
    headerHeight = 'h-16',
}: PageLayoutProps) {
    return (
        <div className={cn('flex flex-col h-screen bg-gray-950', className)}>
            {header && (
                <header className={cn('flex-shrink-0', headerHeight)}>
                    {header}
                </header>
            )}
            <div className="flex flex-1 overflow-hidden">
                {sidebar && (
                    <aside className={cn('flex-shrink-0 bg-gray-900 border-r border-gray-700/50', sidebarWidth)}>
                        {sidebar}
                    </aside>
                )}
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
            {footer && (
                <footer className="flex-shrink-0">
                    {footer}
                </footer>
            )}
        </div>
    );
}

export interface ViewContainerProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    fullHeight?: boolean;
    scrollable?: boolean;
}

export function ViewContainer({
    children,
    className = '',
    padding = 'md',
    fullHeight = true,
    scrollable = true,
}: ViewContainerProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-3 md:p-4',
        md: 'p-4 md:p-6 lg:p-8',
        lg: 'p-6 md:p-8 lg:p-10',
    };

    return (
        <div
            className={cn(
                'bg-gray-950',
                fullHeight && 'h-full',
                scrollable && 'overflow-y-auto custom-scrollbar',
                paddingStyles[padding],
                className
            )}
        >
            {children}
        </div>
    );
}

export interface SectionProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
    divider?: boolean;
}

export function Section({
    children,
    title,
    description,
    action,
    className = '',
    divider = false,
}: SectionProps) {
    return (
        <section className={cn('space-y-4', className)}>
            {(title || action) && (
                <header className={cn('flex items-start justify-between gap-4', divider && 'pb-4 border-b border-gray-700/50')}>
                    <div>
                        {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
                        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
                    </div>
                    {action && <div className="flex-shrink-0 mt-1">{action}</div>}
                </header>
            )}
            <div>{children}</div>
        </section>
    );
}

export interface GridProps {
    children: React.ReactNode;
    columns?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    gap?: 'sm' | 'md' | 'lg' | 'xl';
    responsive?: boolean;
    className?: string;
}

export function Grid({
    children,
    columns = 3,
    gap = 'md',
    responsive = true,
    className = '',
}: GridProps) {
    const columnStyles = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
        12: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
    };

    const gapStyles = {
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
    };

    return (
        <div
            className={cn(
                'grid',
                responsive ? columnStyles[columns] : `grid-cols-${columns}`,
                gapStyles[gap],
                className
            )}
        >
            {children}
        </div>
    );
}

export interface StackProps {
    children: React.ReactNode;
    direction?: 'vertical' | 'horizontal';
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    className?: string;
    wrap?: boolean;
}

export function Stack({
    children,
    direction = 'vertical',
    gap = 'md',
    align = 'stretch',
    justify = 'start',
    className = '',
    wrap = false,
}: StackProps) {
    const gapStyles = {
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
    };

    const alignStyles = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
    };

    const justifyStyles = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
    };

    return (
        <div
            className={cn(
                'flex',
                direction === 'vertical' ? 'flex-col' : 'flex-row',
                wrap && 'flex-wrap',
                gapStyles[gap],
                alignStyles[align],
                justifyStyles[justify],
                className
            )}
        >
            {children}
        </div>
    );
}

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
    orientation?: 'horizontal' | 'vertical';
    variant?: 'solid' | 'dashed' | 'dotted';
    label?: string;
    labelPosition?: 'start' | 'center' | 'end';
}

export function Divider({
    orientation = 'horizontal',
    variant = 'solid',
    label,
    labelPosition = 'center',
    className = '',
    ...props
}: DividerProps) {
    const variantStyles = {
        solid: 'border-t border-gray-700/50',
        dashed: 'border-t border-dashed border-gray-700/50',
        dotted: 'border-t border-dotted border-gray-700/50',
    };

    if (orientation === 'vertical') {
        return (
            <hr
                className={cn('h-full w-px', variantStyles[variant].replace('border-t', 'border-l'), className)}
                aria-orientation="vertical"
                {...props}
            />
        );
    }

    if (!label) {
        return (
            <hr className={cn(variantStyles[variant], className)} aria-orientation="horizontal" {...props} />
        );
    }

    return (
        <div className={cn('flex items-center gap-4', className)} role="separator" aria-orientation="horizontal">
            <hr className={cn('flex-1', variantStyles[variant])} />
            <span className={cn(
                'text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap flex-shrink-0',
                labelPosition === 'start' && 'ml-0',
                labelPosition === 'end' && 'mr-0'
            )}>
                {label}
            </span>
            <hr className={cn('flex-1', variantStyles[variant])} />
        </div>
    );
}

export interface SpacerProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    className?: string;
}

export function Spacer({size = 'md', className = ''}: SpacerProps) {
    const sizeStyles = {
        xs: 'h-1',
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6',
        xl: 'h-8',
        '2xl': 'h-12',
        '3xl': 'h-16',
    };

    return <div className={cn(sizeStyles[size], className)} aria-hidden="true" />;
}

export interface ContainerProps {
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;
}

export function Container({children, size = 'lg', className = ''}: ContainerProps) {
    const sizeStyles = {
        sm: 'max-w-3xl',
        md: 'max-w-5xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-full',
    };

    return (
        <div className={cn('mx-auto w-full px-4 md:px-6 lg:px-8', sizeStyles[size], className)}>
            {children}
        </div>
    );
}