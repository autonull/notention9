import type { Template } from './domain.js';

export type View = 'notes' | 'ontology' | 'network' | 'chat' | 'settings' | 'map' | 'timeline' | 'trash' | 'simulator' | 'dashboard' | 'actions';

export type SidebarViewMode = 'list' | 'grid' | 'cloud';

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
  };
  ontology?: any[];
  customTemplates?: Template[];
}