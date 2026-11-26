import React, {useRef} from 'react';
import type {SettingsTab} from '@notention/core';
import {SETTINGS_GROUPS} from '../../config/uiSurfaces';
import {cn} from '../../utils/ui';
import {useView} from '../../hooks/useViewContext';
import {SettingsDirectoryProps} from './SettingsDirectoryProps';
import {QuestionMarkCircleIcon} from '../ui/icons';

const HelpIcon = ({topicId}: {topicId?: string}) => (
  topicId ? <QuestionMarkCircleIcon className="w-4 h-4 ml-1 text-[var(--app-muted)]" /> : null
);

const SettingRow = ({setting, isActive, onClick}: {setting: {id: SettingsTab; label: string}; isActive: boolean; onClick: () => void}) => (
  <button
    type="button"
    role="tab"
    id={`settings-tab-${setting.id}`}
    aria-selected={isActive}
    aria-controls={`settings-panel-${setting.id}`}
    tabIndex={isActive ? 0 : -1}
    onClick={onClick}
    className={cn(
      'flex h-8 w-full items-center rounded-md px-2 text-[13px] transition-colors',
      isActive
        ? 'bg-[var(--app-raised)] font-medium text-[var(--app-text)]'
        : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text-secondary)]'
    )}
  >
    <span className="truncate flex-1">{setting.label}</span>
    <HelpIcon topicId={setting.id} />
  </button>
);

const SettingsWizard = ({onComplete, onSkip}: {onComplete: () => void; onSkip: () => void}) => (
  <div className="settings-wizard p-4 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)]" data-testid="settings-wizard">
    <p className="text-[13px] text-[var(--app-text-secondary)] mb-3">Welcome to Settings! Let's get you set up.</p>
    <div className="flex gap-2">
      <button onClick={onComplete} className="btn btn-primary btn-sm">Get Started</button>
      <button onClick={onSkip} className="btn btn-secondary btn-sm">Skip</button>
    </div>
  </div>
);

export function SettingsDirectory(props: SettingsDirectoryProps) {
  const {settingsTab, setSettingsTab} = useView();
  const tabRefs = useRef(new Map<SettingsTab, HTMLButtonElement>());
  const tabs = SETTINGS_GROUPS.flatMap(group => group.tabs);
  const current = tabs.findIndex(tab => tab.id === settingsTab);

  const select = (id: SettingsTab) => {
    setSettingsTab(id);
    tabRefs.current.get(id)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const next =
        event.key === 'ArrowDown' || event.key === 'ArrowRight' ? current + 1 :
        event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? current - 1 :
        event.key === 'Home' ? 0 :
        event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    select(tabs[(next + tabs.length) % tabs.length].id);
  };

  return (
    <nav aria-label="Settings sections" className={cn('min-h-0 overflow-y-auto custom-scrollbar', props.className as string)} data-testid="settings-directory">
      <input
        type="search"
        placeholder="Search settings…"
        className="mb-3 w-full h-9 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] px-2.5 text-[13px] text-[var(--app-text)] focus:border-[var(--app-accent-line)] focus:outline-none"
        data-testid="settings-search"
      />
      <div role="tablist" aria-orientation="vertical" onKeyDown={handleKeyDown} className="space-y-3">
        {SETTINGS_GROUPS.map(group => (
          <details key={group.id} open={true} className="space-y-1" data-testid={`settings-group-${group.id}`}>
            <summary className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-faint)] cursor-pointer flex items-center gap-1">
              {group.label} <HelpIcon topicId={group.id} />
            </summary>
            <div className="space-y-0.5">
              {group.tabs.map(tab => (
                <SettingRow
                  key={tab.id}
                  setting={tab}
                  isActive={settingsTab === tab.id}
                  onClick={() => select(tab.id)}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
      {props.showWizard && (
        <SettingsWizard
          onComplete={props.onWizardComplete ?? (() => {})}
          onSkip={props.onWizardSkip ?? (() => {})}
        />
      )}
      <div className="mt-4 settings-actions space-y-2" data-testid="settings-actions">
        <button className="btn btn-secondary btn-sm w-full justify-start" data-testid="settings-export">Export</button>
        <button className="btn btn-secondary btn-sm w-full justify-start" data-testid="settings-import">Import</button>
        <button className="btn btn-secondary btn-sm w-full justify-start" data-testid="settings-diff">Show Diff</button>
      </div>
    </nav>
  );
}