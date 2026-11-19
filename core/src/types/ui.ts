import type { Template } from './domain.js';

export type View = 'notes' | 'network' | 'chat' | 'settings' | 'map' | 'timeline' | 'trash' | 'simulator' | 'inbox' | 'actions' | 'responses' | 'labels' | 'ontology' | 'skills';

export type SidebarViewMode = 'list' | 'grid';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
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
}