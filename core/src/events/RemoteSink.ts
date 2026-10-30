/**
 * Remote sink for event emission (HTTP endpoint)
 */

import { EventSink, AnyEvent } from './EventEmitter.js';

export interface RemoteSinkOptions {
    name?: string;
    enabled?: boolean;
    sampleRate?: number;
    endpoint: string;
    apiKey?: string;
    batchSize?: number;
    flushIntervalMs?: number;
    timeoutMs?: number;
    headers?: Record<string, string>;
}

export class RemoteSink implements EventSink {
    name: string;
    enabled: boolean;
    sampleRate: number;
    private endpoint: string;
    private apiKey?: string;
    private batchSize: number;
    private flushIntervalMs: number;
    private timeoutMs: number;
    private headers: Record<string, string>;
    private buffer: AnyEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private isFlushing = false;

    constructor(options: RemoteSinkOptions) {
        this.name = options.name ?? 'remote';
        this.enabled = options.enabled ?? true;
        this.sampleRate = options.sampleRate ?? 0.1; // Default 10% sampling for remote
        this.endpoint = options.endpoint;
        this.apiKey = options.apiKey;
        this.batchSize = options.batchSize ?? 50;
        this.flushIntervalMs = options.flushIntervalMs ?? 10000;
        this.timeoutMs = options.timeoutMs ?? 5000;
        this.headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.apiKey) {
            this.headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
    }

    emit(event: AnyEvent): void {
        this.buffer.push(event);
        
        if (this.buffer.length >= this.batchSize) {
            this.flush();
        }
    }

    async flush(): Promise<void> {
        if (this.buffer.length === 0 || this.isFlushing) return;

        this.isFlushing = true;
        const events = this.buffer.splice(0, this.batchSize);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            await fetch(this.endpoint, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ events }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.error(`RemoteSink timeout:`, err);
            } else {
                console.error(`RemoteSink error:`, err);
            }
            // Re-buffer on failure (but limit to prevent memory issues)
            this.buffer.unshift(...events.slice(-this.batchSize));
        } finally {
            this.isFlushing = false;
        }
    }

    async shutdown(): Promise<void> {
        this.enabled = false;
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        await this.flush();
    }

    startAutoFlush(): void {
        if (this.flushInterval) return;
        this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
    }

    stopAutoFlush(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }
}