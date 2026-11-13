import type { Template } from './domain.js';

export type View = 'notes' | 'ontology' | 'network' | 'chat' | 'settings' | 'map' | 'timeline' | 'trash' | 'simulator' | 'inbox' | 'actions' | 'responses';

export type SidebarViewMode = 'list' | 'grid';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language?: string;
  developerMode: boolean;
  privacyMode?: string;
  aiEnabled?: boolean;
  aiProvider?: string;
  aiModel?: string;
  googleGeminiApiKey?: string;
  aiRemoteConsent?: boolean;
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
}