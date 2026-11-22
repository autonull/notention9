import type { Template } from './domain.js';

export type View = 'notes' | 'settings';

export type NoteMode = 'canvas' | 'list' | 'board' | 'map' | 'timeline';

export type NotesSection = 'all' | 'tasks' | 'tags' | 'trash';

export type NoteTab = 'next' | 'matches' | 'replies';

export type SettingsTab =
  | 'general'
  | 'appearance'
  | 'language'
  | 'shortcuts'
  | 'accessibility'
  | 'network'
  | 'nostr'
  | 'sync'
  | 'relayDiscovery'
  | 'ai'
  | 'automation'
  | 'matchDigest'
  | 'data'
  | 'metrics'
  | 'revisions'
  | 'labels'
  | 'ontology'
  | 'skills';

/** Old hash segments still accepted by the redirect table. */
export type LegacyView =
  | 'inbox'
  | 'capture'
  | 'network'
  | 'connections'
  | 'chat'
  | 'responses'
  | 'actions'
  | 'map'
  | 'timeline'
  | 'trash'
  | 'labels'
  | 'ontology'
  | 'skills'
  | 'simulator'
  | 'dashboard';

export type SidebarViewMode = 'list' | 'grid';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable';
  accentColor: string;
  language?: string;
  developerMode: boolean;
  privacyMode?: string;
  aiEnabled?: boolean;
  automationEnabled?: boolean;
  aiProvider?: string;
  aiModel?: string;
  googleGeminiApiKey?: string;
  aiRemoteConsent?: boolean;
  aiPiiRedactionEnabled?: boolean;
  aiPiiOverrideEnabled?: boolean;
  capabilities?: {
    browser?: boolean;
    files?: boolean;
  };
  user?: {
    name?: string;
  };
  nostr: {
    privkey?: string | null;
    relays: string[];
    publishEnabled?: boolean;
  };
  meshtastic?: {
    enabled?: boolean;
    connectionType?: 'webserial' | 'http' | 'server-proxy';
    port?: string;
    saveReceivedNotes?: boolean;
    publishEnabled?: boolean;
  };
  ontology?: any[];
  customTemplates?: Template[];
  accessibility?: {
    reducedMotion?: boolean;
    highContrast?: boolean;
  };
  matchDigest?: {
    enabled: boolean;
    frequency: 'daily' | 'on-demand' | 'disabled';
    quietHoursStart: number;  // 0-23
    quietHoursEnd: number;    // 0-23
    minMatchScore: number;    // 0-1
    includePendingActions: boolean;
    includeAcceptedMatches: boolean;
    includeDismissedMatches: boolean;
    includeCompletedActions: boolean;
  };
  autoBackup?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
    encrypt: boolean;
    passphrase?: string;
    rotationCount: number;  // number of backups to keep
    lastBackupAt?: string;  // ISO timestamp
    nextBackupAt?: string;  // ISO timestamp
  };
  /** User-defined cross-key mappings for matching custom properties */
  customCrossKeyMappings?: Record<string, string[]>;

  /** Sync bandwidth & battery budget settings */
  sync?: {
    /** Only sync over WiFi (skip on cellular) */
    wifiOnly?: boolean;
    /** Maximum sync payload size per session in bytes */
    maxPayloadBytes?: number;
    /** Batch multiple events into single publish */
    batchEnabled?: boolean;
    /** Batch window in milliseconds */
    batchWindowMs?: number;
    /** Sync interval in minutes (0 = manual only) */
    intervalMinutes?: number;
    /** Compress sync payloads */
    compress?: boolean;
    /** Track payload size metrics */
    trackMetrics?: boolean;
    /** Last successful sync timestamp */
    lastSyncAt?: number;
    /** Last sync payload size in bytes */
    lastPayloadBytes?: number;
    /** Cumulative bytes synced */
    totalBytesSynced?: number;
    /** Cumulative notes synced */
    totalNotesSynced?: number;
  };
}