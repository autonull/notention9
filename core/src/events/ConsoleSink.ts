/**
 * Console sink for event emission
 */

import { EventSink, AnyEvent, ErrorEvent } from './EventEmitter.js';

export interface ConsoleSinkOptions {
    name?: string;
    enabled?: boolean;
    sampleRate?: number;
    prettyPrint?: boolean;
    minSeverity?: 'warning' | 'error' | 'critical';
    colors?: boolean;
}

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
};

const CATEGORY_COLORS: Record<string, string> = {
    extraction: COLORS.cyan,
    match: COLORS.blue,
    strategy: COLORS.magenta,
    error: COLORS.red,
    performance: COLORS.green,
    lifecycle: COLORS.yellow,
};

export class ConsoleSink implements EventSink {
    name: string;
    enabled: boolean;
    sampleRate: number;
    minSeverity: 'warning' | 'error' | 'critical';
    private prettyPrint: boolean;
    private colors: boolean;

    constructor(options: ConsoleSinkOptions = {}) {
        this.name = options.name ?? 'console';
        this.enabled = options.enabled ?? true;
        this.sampleRate = options.sampleRate ?? 1.0;
        this.prettyPrint = options.prettyPrint ?? true;
        this.colors = options.colors ?? (typeof process !== 'undefined' && process.stdout.isTTY);
        this.minSeverity = options.minSeverity ?? 'warning';
    }

    emit(event: AnyEvent): void {
        const categoryColor = this.colors ? CATEGORY_COLORS[event.category] ?? '' : '';
        const reset = this.colors ? COLORS.reset : '';
        
        if (this.prettyPrint) {
            const severity = this.getSeverity(event);
            const severityColor = this.getSeverityColor(severity);
            const time = new Date(event.timestamp).toISOString();
            
            console.log(
                `${categoryColor}[${event.category.toUpperCase()}]${reset} ` +
                `${COLORS.gray}${time}${reset} ` +
                `${severityColor}${event.type}${reset} ` +
                `${JSON.stringify(event.payload, null, 2)}`
            );
        } else {
            console.log(JSON.stringify(event));
        }
    }

    private getSeverity(event: AnyEvent): 'warning' | 'error' | 'critical' | 'info' {
        if (event.category === 'error') {
            return (event.payload as ErrorEvent).severity;
        }
        return 'info';
    }

    private getSeverityColor(severity: string): string {
        if (!this.colors) return '';
        switch (severity) {
            case 'critical': return COLORS.red;
            case 'error': return COLORS.red;
            case 'warning': return COLORS.yellow;
            default: return COLORS.gray;
        }
    }

    flush(): void {
        // Console is synchronous, no flush needed
    }

    async shutdown(): Promise<void> {
        this.enabled = false;
    }
}

export const consoleSink = new ConsoleSink({ prettyPrint: true });