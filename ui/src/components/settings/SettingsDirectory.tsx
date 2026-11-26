import { useState, useCallback, useMemo } from 'react';
import { useSettings } from '@/hooks/useSettingsContext';
import { useHelp } from '@/hooks/useHelp';
import { SettingsWizard } from './SettingsWizard';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';
import { 
  SearchIcon, ChevronRightIcon, HelpCircleIcon, 
  DownloadIcon, UploadIcon, GitCompareIcon,
  SparklesIcon
} from '../ui/icons';
import type { AppSettings } from '@notention/core';
import { SETTINGS_GROUPS } from '../../config/uiSurfaces';

interface SettingsDirectoryProps {
  className?: string;
  showWizard?: boolean;
  onWizardComplete?: () => void;
  onWizardSkip?: () => void;
}

interface SettingsGroup {
  id: string;
  label: string;
  tabs: Array<{ id: string; label: string }>;
  helpTopicId?: string;
  defaultExpanded?: boolean;
  settings?: SettingsItem[];
}

interface SettingsItem {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'input' | 'action';
  value?: unknown;
  options?: Array<{ value: unknown; label: string }>;
  onChange?: (value: unknown) => void;
  action?: () => void;
}

const GROUP_CONFIG: Record<string, { helpTopicId: string; defaultExpanded: boolean }> = {
  general: { helpTopicId: 'settings-general', defaultExpanded: true },
  networkIdentity: { helpTopicId: 'settings-network', defaultExpanded: false },
  aiAutomation: { helpTopicId: 'settings-ai', defaultExpanded: false },
  data: { helpTopicId: 'settings-data', defaultExpanded: false },
  advanced: { helpTopicId: 'settings-advanced', defaultExpanded: false },
};

export function SettingsDirectory({ 
  className, 
  showWizard = false, 
  onWizardComplete, 
  onWizardSkip 
}: SettingsDirectoryProps) {
  const { settings, setSettings } = useSettings();
  const { setCurrentTopic } = useHelp();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(SETTINGS_GROUPS.filter(g => GROUP_CONFIG[g.id]?.defaultExpanded).map(g => g.id))
  );
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState<Record<string, { current: unknown; default: unknown }> | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_GROUPS;
    
    const query = searchQuery.toLowerCase();
    return SETTINGS_GROUPS.map(group => ({
      ...group,
      tabs: group.tabs.filter(tab => 
        tab.label.toLowerCase().includes(query) || tab.id.toLowerCase().includes(query)
      ),
    })).filter(group => group.tabs.length > 0);
  }, [searchQuery]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      version: 1,
      timestamp: new Date().toISOString(),
      settings: { ...settings },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notention-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            if (imported.settings) {
              setSettings(prev => ({ ...prev, ...imported.settings }));
            }
          } catch (err) {
            console.error('Failed to import settings:', err);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [setSettings]);

  const handleShowDiff = useCallback(() => {
    const defaultSettings: AppSettings = {
      theme: 'dark',
      density: 'comfortable',
      accentColor: '#2563eb',
      developerMode: false,
      aiEnabled: false,
      aiProvider: 'local',
      aiModel: '',
      googleGeminiApiKey: '',
      nostr: { privkey: null, relays: [] },
      ontology: [],
    };
    
    const diff: Record<string, { current: unknown; default: unknown }> = {};
    for (const key of Object.keys(settings) as Array<keyof AppSettings>) {
      const current = settings[key];
      const defaultVal = defaultSettings[key];
      if (JSON.stringify(current) !== JSON.stringify(defaultVal)) {
        diff[key] = { current, default: defaultVal };
      }
    }
    setDiffData(diff);
    setShowDiff(true);
  }, [settings]);

  const getGroupSettings = useCallback((groupId: string): SettingsItem[] => {
    const group = SETTINGS_GROUPS.find(g => g.id === groupId);
    if (!group) return [];
    
    const items: SettingsItem[] = [];
    
    switch (groupId) {
      case 'general':
        items.push(
          { id: 'theme', label: 'Theme', type: 'select', value: settings.theme, options: [
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'system', label: 'System' },
          ], onChange: v => setSettings({ ...settings, theme: v as 'dark' | 'light' | 'system' }) },
          { id: 'density', label: 'Density', type: 'select', value: settings.density, options: [
            { value: 'compact', label: 'Compact' },
            { value: 'comfortable', label: 'Comfortable' },
          ], onChange: v => setSettings({ ...settings, density: v as 'compact' | 'comfortable' }) },
          { id: 'accentColor', label: 'Accent Color', type: 'input', value: settings.accentColor, onChange: v => setSettings({ ...settings, accentColor: v as string }) },
          { id: 'developerMode', label: 'Developer Mode', type: 'toggle', value: settings.developerMode, onChange: v => setSettings({ ...settings, developerMode: v as boolean }) },
        );
        break;
      case 'networkIdentity':
        items.push(
          { id: 'nostr.privkey', label: 'Nostr Private Key', type: 'input', value: settings.nostr.privkey || '', onChange: v => setSettings({ ...settings, nostr: { ...settings.nostr, privkey: v as string } }) },
          { id: 'nostr.relays', label: 'Relays', type: 'input', value: settings.nostr.relays.join(', '), onChange: v => setSettings({ ...settings, nostr: { ...settings.nostr, relays: (v as string).split(',').map(s => s.trim()) } }) },
        );
        break;
      case 'aiAutomation':
        items.push(
          { id: 'aiEnabled', label: 'Enable AI', type: 'toggle', value: settings.aiEnabled, onChange: v => setSettings({ ...settings, aiEnabled: v as boolean }) },
          { id: 'aiProvider', label: 'AI Provider', type: 'select', value: settings.aiProvider, options: [
            { value: 'local', label: 'Local' },
            { value: 'gemini', label: 'Gemini' },
            { value: 'openai', label: 'OpenAI' },
          ], onChange: v => setSettings({ ...settings, aiProvider: v as 'local' | 'gemini' | 'openai' }) },
        );
        break;
      case 'data':
        items.push(
          { id: 'export', label: 'Export Data', type: 'action', action: handleExport },
          { id: 'import', label: 'Import Data', type: 'action', action: handleImport },
        );
        break;
      case 'advanced':
        items.push(
          { id: 'labels', label: 'Manage Labels', type: 'action', action: () => {} },
          { id: 'ontology', label: 'Manage Ontology', type: 'action', action: () => {} },
          { id: 'skills', label: 'Manage Skills', type: 'action', action: () => {} },
        );
        break;
    }
    return items;
  }, [settings, setSettings, handleExport, handleImport]);

  if (showDiff && diffData) {
    return (
      <div className={cn('settings-directory settings-diff-view', className)} data-testid="settings-directory">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Settings Diff</h2>
          <Button variant="ghost" size="sm" onClick={() => { setShowDiff(false); setDiffData(null); }} data-testid="diff-close">
            Close Diff
          </Button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(diffData).map(([key, { current, default: defaultVal }]) => (
            <div key={key} className="p-3 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)]">
              <div className="font-mono text-sm text-[var(--app-accent)] mb-2">{key}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[var(--app-muted)]">Current:</span>
                  <code className="ml-2 text-[var(--app-text)]">{JSON.stringify(current)}</code>
                </div>
                <div>
                  <span className="text-[var(--app-muted)]">Default:</span>
                  <code className="ml-2 text-[var(--color-success)]">{JSON.stringify(defaultVal)}</code>
                </div>
              </div>
            </div>
          ))}
          {Object.keys(diffData).length === 0 && (
            <div className="text-center py-8 text-[var(--app-muted)]">
              No differences from defaults
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('settings-directory flex flex-col h-full', className)} data-testid="settings-directory">
      <div className="mb-4">
        <label htmlFor="settings-search" className="sr-only">Search settings</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-muted)]" />
          <input
            id="settings-search"
            type="search"
            placeholder="Search settings…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] text-[var(--app-text)] placeholder-[var(--app-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-sm"
            data-testid="settings-search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredGroups.map(group => {
          const config = GROUP_CONFIG[group.id];
          const isExpanded = expandedGroups.has(group.id);
          const groupSettings = getGroupSettings(group.id);
          
          return (
            <details 
              key={group.id} 
              open={isExpanded || searchQuery.trim().length > 0} 
              onToggle={() => toggleGroup(group.id)}
              className="border border-[var(--app-line)] rounded-lg overflow-hidden bg-[var(--app-surface)]"
              data-testid={`settings-group-${group.id}`}
            >
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
                <span className="font-medium text-[var(--app-text)]">{group.label}</span>
                <div className="flex items-center gap-2">
                  {config?.helpTopicId && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentTopic(config.helpTopicId!);
                      }}
                      className="p-1 text-[var(--app-muted)] hover:text-[var(--app-accent)] transition-colors rounded"
                      aria-label={`Help for ${group.label}`}
                      data-testid={`group-help-${group.id}`}
                    >
                      <HelpCircleIcon className="w-5 h-5" />
                    </button>
                  )}
                  <ChevronRightIcon 
                    className={cn('w-5 h-5 text-[var(--app-muted)] transition-transform', isExpanded && 'rotate-90')} 
                  />
                </div>
              </summary>
              
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--app-line)]">
                {group.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => window.dispatchEvent(new CustomEvent('action:openSettingsTab', { detail: { tab: tab.id } }))}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--app-raised)] transition-colors flex items-center gap-2"
                    data-testid={`settings-tab-${tab.id}`}
                  >
                    <span className="flex-1">{tab.label}</span>
                    <ChevronRightIcon className="w-4 h-4 text-[var(--app-muted)]" />
                  </button>
                ))}
                
                {groupSettings.length > 0 && (
                  <div className="pt-2 border-t border-[var(--app-line)] space-y-2">
                    {groupSettings.map(item => (
                      <div key={item.id} className="space-y-1">
                        <label className="text-xs font-medium text-[var(--app-muted)]">{item.label}</label>
                        {item.type === 'toggle' && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.value as boolean}
                              onChange={e => item.onChange?.(e.target.checked)}
                              className="w-4 h-4 rounded border-[var(--app-line)] bg-[var(--app-surface)] focus:ring-2 focus:ring-[var(--app-accent)]"
                              data-testid={`setting-${item.id}`}
                            />
                          </label>
                        )}
                        {item.type === 'select' && (
                          <select
                            value={item.value as string}
                            onChange={e => item.onChange?.(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-sm"
                            data-testid={`setting-${item.id}`}
                          >
                            {item.options?.map(opt => (
                              <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {item.type === 'input' && (
                          <input
                            type="text"
                            value={item.value as string}
                            onChange={e => item.onChange?.(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--app-surface)] border border-[var(--app-line)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] text-sm"
                            data-testid={`setting-${item.id}`}
                          />
                        )}
                        {item.type === 'action' && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={item.action}
                            className="w-full justify-start"
                            data-testid={`setting-${item.id}`}
                          >
                            {item.label}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      {showWizard && (
        <SettingsWizard 
          onComplete={onWizardComplete ?? (() => {})} 
          onSkip={onWizardSkip ?? (() => {})} 
        />
      )}

      <div className="mt-4 flex flex-wrap gap-2 p-4 border-t border-[var(--app-line)] bg-[var(--app-surface)] rounded-lg">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleExport}
          leftIcon={<DownloadIcon className="w-4 h-4" />}
          data-testid="settings-export"
        >
          Export
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleImport}
          leftIcon={<UploadIcon className="w-4 h-4" />}
          data-testid="settings-import"
        >
          Import
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleShowDiff}
          leftIcon={<GitCompareIcon className="w-4 h-4" />}
          data-testid="settings-diff"
        >
          Show Diff
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => { 
            window.dispatchEvent(new CustomEvent('action:openSettingsTab', { detail: { tab: 'general' } }));
            setTimeout(() => setExpandedGroups(prev => new Set([...prev, 'general'])), 0);
          }}
          leftIcon={<SparklesIcon className="w-4 h-4" />}
          data-testid="settings-wizard-trigger"
        >
          Run Wizard
        </Button>
      </div>
    </div>
  );
}