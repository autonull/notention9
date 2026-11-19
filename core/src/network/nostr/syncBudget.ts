import type { NostrEvent } from '../../types/index.js';
import { encodeEventToCBOR } from './protocol.js';
import { AppSettings } from '../../types/ui.js';

// Extended Navigator interface for Network Information API
interface NavigatorWithConnection extends Navigator {
    connection?: {
        effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
        type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
    };
}

export interface SyncBudgetConfig {
    wifiOnly: boolean;
    maxPayloadBytes: number;
    batchEnabled: boolean;
    batchWindowMs: number;
    intervalMinutes: number;
    compress: boolean;
    trackMetrics: boolean;
}

export interface SyncMetrics {
    lastSyncAt: number;
    lastPayloadBytes: number;
    totalBytesSynced: number;
    totalNotesSynced: number;
    bytesPerNote: number;
}

export interface DeltaSyncResult {
    events: NostrEvent[];
    payloadBytes: number;
    notesCount: number;
    isDelta: boolean;
    sinceTimestamp?: number;
}

export { getConfig, getMetrics };

const DEFAULT_CONFIG: SyncBudgetConfig = {
    wifiOnly: false,
    maxPayloadBytes: 1024 * 1024, // 1 MB
    batchEnabled: true,
    batchWindowMs: 500,
    intervalMinutes: 0, // manual only by default
    compress: true,
    trackMetrics: true,
};

function getConfig(settings: AppSettings): SyncBudgetConfig {
    const s = settings.sync || {};
    return {
        wifiOnly: s.wifiOnly ?? DEFAULT_CONFIG.wifiOnly,
        maxPayloadBytes: s.maxPayloadBytes ?? DEFAULT_CONFIG.maxPayloadBytes,
        batchEnabled: s.batchEnabled ?? DEFAULT_CONFIG.batchEnabled,
        batchWindowMs: s.batchWindowMs ?? DEFAULT_CONFIG.batchWindowMs,
        intervalMinutes: s.intervalMinutes ?? DEFAULT_CONFIG.intervalMinutes,
        compress: s.compress ?? DEFAULT_CONFIG.compress,
        trackMetrics: s.trackMetrics ?? DEFAULT_CONFIG.trackMetrics,
    };
}

function getMetrics(settings: AppSettings): SyncMetrics {
    const s = settings.sync || {};
    return {
        lastSyncAt: s.lastSyncAt ?? 0,
        lastPayloadBytes: s.lastPayloadBytes ?? 0,
        totalBytesSynced: s.totalBytesSynced ?? 0,
        totalNotesSynced: s.totalNotesSynced ?? 0,
        bytesPerNote: s.totalNotesSynced && s.totalBytesSynced
            ? s.totalBytesSynced / s.totalNotesSynced
            : 0,
    };
}

export async function isNetworkAllowed(config: SyncBudgetConfig): Promise<boolean> {
    if (!config.wifiOnly) return true;

    if (typeof navigator === 'undefined') {
        // No navigator (Node.js) - assume allowed
        return true;
    }

    const nav = navigator as NavigatorWithConnection;
    if (!nav.connection) {
        // No Network Information API - assume allowed (desktop)
        return true;
    }

    const connection = nav.connection;
    const effectiveType = connection.effectiveType;
    const type = connection.type;

    // Allow on WiFi, ethernet, or unknown
    if (type === 'wifi' || type === 'ethernet' || type === 'none') {
        return true;
    }

    // Block on cellular (4g, 3g, 2g, slow-2g)
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g' || effectiveType === '4g') {
        return false;
    }

    return true;
}

export function calculateEventSize(event: NostrEvent, useCBOR: boolean): number {
    if (useCBOR) {
        return encodeEventToCBOR(event).length;
    }
    return new TextEncoder().encode(JSON.stringify(event)).length;
}

export function calculateBatchSize(events: NostrEvent[], useCBOR: boolean): number {
    return events.reduce((sum, e) => sum + calculateEventSize(e, useCBOR), 0);
}

export function createDeltaFilter(
    sinceTimestamp: number,
    authors: string[],
    kinds: number[] = [1, 35000]
): { kinds: number[]; authors: string[]; since: number } {
    return {
        kinds,
        authors,
        since: Math.floor(sinceTimestamp / 1000),
    };
}

export function shouldSyncNow(config: SyncBudgetConfig, lastSyncAt: number): boolean {
    if (config.intervalMinutes <= 0) return false; // manual only
    const now = Date.now();
    const intervalMs = config.intervalMinutes * 60 * 1000;
    return now - lastSyncAt >= intervalMs;
}

export function createSyncBudgetReport(settings: AppSettings): {
    config: SyncBudgetConfig;
    metrics: SyncMetrics;
    networkAllowed: boolean;
    canSyncNow: boolean;
    estimatedNextSyncBytes: number;
} {
    const config = getConfig(settings);
    const metrics = getMetrics(settings);

    return {
        config,
        metrics,
        networkAllowed: true, // Will be checked async
        canSyncNow: shouldSyncNow(config, metrics.lastSyncAt),
        estimatedNextSyncBytes: metrics.bytesPerNote * 10, // rough estimate
    };
}

export async function updateSyncMetrics(
    settings: AppSettings,
    payloadBytes: number,
    notesCount: number
): Promise<Partial<AppSettings>> {
    const s = settings.sync || {};
    const newTotalBytes = (s.totalBytesSynced ?? 0) + payloadBytes;
    const newTotalNotes = (s.totalNotesSynced ?? 0) + notesCount;

    return {
        sync: {
            ...s,
            lastSyncAt: Date.now(),
            lastPayloadBytes: payloadBytes,
            totalBytesSynced: newTotalBytes,
            totalNotesSynced: newTotalNotes,
        },
    };
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getSyncBudgetStatus(settings: AppSettings): {
    status: 'ok' | 'warning' | 'exceeded';
    message: string;
    payloadBytes: number;
    maxPayloadBytes: number;
    utilization: number;
} {
    const config = getConfig(settings);
    const metrics = getMetrics(settings);

    const utilization = config.maxPayloadBytes > 0
        ? metrics.lastPayloadBytes / config.maxPayloadBytes
        : 0;

    if (utilization >= 1) {
        return {
            status: 'exceeded',
            message: `Last sync payload (${formatBytes(metrics.lastPayloadBytes)}) exceeds budget (${formatBytes(config.maxPayloadBytes)})`,
            payloadBytes: metrics.lastPayloadBytes,
            maxPayloadBytes: config.maxPayloadBytes,
            utilization,
        };
    }
    if (utilization >= 0.8) {
        return {
            status: 'warning',
            message: `Last sync payload (${formatBytes(metrics.lastPayloadBytes)}) is at ${Math.round(utilization * 100)}% of budget (${formatBytes(config.maxPayloadBytes)})`,
            payloadBytes: metrics.lastPayloadBytes,
            maxPayloadBytes: config.maxPayloadBytes,
            utilization,
        };
    }
    return {
        status: 'ok',
        message: `Last sync payload: ${formatBytes(metrics.lastPayloadBytes)} / ${formatBytes(config.maxPayloadBytes)} budget`,
        payloadBytes: metrics.lastPayloadBytes,
        maxPayloadBytes: config.maxPayloadBytes,
        utilization,
    };
}