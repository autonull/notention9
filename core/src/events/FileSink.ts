/**
 * File sink for event emission
 */

import { EventSink, AnyEvent } from './EventEmitter.js';
import { existsSync, mkdirSync } from 'fs';
import { writeFile, appendFile } from 'fs/promises';
import { dirname } from 'path';

export interface FileSinkOptions {
    name?: string;
    enabled?: boolean;
    sampleRate?: number;
    filePath: string;
    maxFileSize?: number;
    maxFiles?: number;
    format?: 'json' | 'jsonl';
}

export class FileSink implements EventSink {
    name: string;
    enabled: boolean;
    sampleRate: number;
    private filePath: string;
    private maxFileSize: number;
    private maxFiles: number;
    private format: 'json' | 'jsonl';
    private buffer: AnyEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private currentSize = 0;
    private fileIndex = 0;

    constructor(options: FileSinkOptions) {
        this.name = options.name ?? 'file';
        this.enabled = options.enabled ?? true;
        this.sampleRate = options.sampleRate ?? 1.0;
        this.filePath = options.filePath;
        this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB
        this.maxFiles = options.maxFiles ?? 5;
        this.format = options.format ?? 'jsonl';
        
        this.ensureDirectory();
    }

    private ensureDirectory(): void {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }

    private getCurrentFilePath(): string {
        if (this.fileIndex === 0) return this.filePath;
        const ext = this.filePath.lastIndexOf('.');
        const base = ext > 0 ? this.filePath.substring(0, ext) : this.filePath;
        const extension = ext > 0 ? this.filePath.substring(ext) : '';
        return `${base}.${this.fileIndex}${extension}`;
    }

    emit(event: AnyEvent): void {
        this.buffer.push(event);
        this.currentSize += JSON.stringify(event).length;
        
        if (this.currentSize >= this.maxFileSize) {
            this.flush();
        }
    }

    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const events = [...this.buffer];
        this.buffer = [];
        this.currentSize = 0;

        const filePath = this.getCurrentFilePath();
        const content = this.format === 'jsonl'
            ? events.map(e => JSON.stringify(e)).join('\n') + '\n'
            : JSON.stringify(events, null, 2) + '\n';

        try {
            await appendFile(filePath, content);
            
            // Check if we need to rotate
            const stats = await import('fs/promises').then(fs => fs.stat(filePath));
            if (stats.size >= this.maxFileSize && this.fileIndex < this.maxFiles - 1) {
                this.fileIndex++;
            }
        } catch (err) {
            console.error(`FileSink write error:`, err);
            // Re-buffer on failure
            this.buffer.unshift(...events);
            this.currentSize += content.length;
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

    startAutoFlush(intervalMs = 5000): void {
        if (this.flushInterval) return;
        this.flushInterval = setInterval(() => this.flush(), intervalMs);
    }

    stopAutoFlush(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }
}