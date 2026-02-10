import {useEffect, useRef} from 'react';
import {Logger} from '@notention/core';

// Performance monitoring utilities
class PerformanceMonitor {
    private marks: Map<string, number> = new Map();
    private observers: PerformanceObserver[] = [];
    private logger = Logger.getInstance();
    private isMonitoringLongTasks = false;
    private isMonitoringLayout = false;

    // Mark a point in time
    mark(name: string): void {
        this.marks.set(name, performance.now());
    }

    // Measure time between two marks
    measure(startMark: string, endMark: string, name?: string): number | null {
        const startTime = this.marks.get(startMark);
        const endTime = this.marks.get(endMark);

        if (startTime === undefined || endTime === undefined) {
            this.logger.warn(`Missing marks for measurement: ${startMark} -> ${endMark}`);
            return null;
        }

        const duration = endTime - startTime;
        const measureName = name || `${startMark}-to-${endMark}`;

        // Log performance metric
        this.logger.debug(`Performance: ${measureName} took ${duration.toFixed(2)}ms`);

        return duration;
    }

    // Monitor long tasks (>50ms that can block UI)
    monitorLongTasks(): void {
        if (this.isMonitoringLongTasks) return;

        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) {
                            this.logger.warn(`Long task detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
                        }
                    });
                });

                observer.observe({entryTypes: ['longtask']});
                this.observers.push(observer);
                this.isMonitoringLongTasks = true;
            } catch (e) {
                // Ignore if not supported
            }
        }
    }

    // Monitor layout thrashing (frequent style/layout recalculations)
    monitorLayoutThrashing(): void {
        if (this.isMonitoringLayout) return;

        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        this.logger.debug(`Layout shift: ${entry.name} caused ${entry.duration.toFixed(2)}ms`);
                    });
                });

                observer.observe({entryTypes: ['layout-shift']});
                this.observers.push(observer);
                this.isMonitoringLayout = true;
            } catch (e) {
                // Ignore
            }
        }
    }

    // Cleanup function
    destroy(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.marks.clear();
        this.isMonitoringLongTasks = false;
        this.isMonitoringLayout = false;
    }
}

export const perfMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string, deps: any[]): void {
    const renderCount = useRef(0);
    const prevDeps = useRef(deps);
    const logger = Logger.getInstance();

    useEffect(() => {
        renderCount.current += 1;
        const renders = renderCount.current;

        // Check for excessive re-renders
        if (renders > 10) {
            logger.warn(`${componentName} has re-rendered ${renders} times, consider optimizing`);
        }

        // Check for dependency changes causing re-renders
        const changedDeps = deps.filter((dep, index) => dep !== prevDeps.current[index]);
        if (changedDeps.length > 0 && renders > 1) {
            logger.debug(`${componentName} re-rendered due to changed deps:`, changedDeps);
        }

        prevDeps.current = deps;
    });

    useEffect(() => {
        perfMonitor.mark(`${componentName}-mount`);
        return () => {
            perfMonitor.mark(`${componentName}-unmount`);
            perfMonitor.measure(`${componentName}-mount`, `${componentName}-unmount`, `${componentName}-lifetime`);
        };
    }, []);
}
