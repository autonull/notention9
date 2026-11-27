import { SettingsDirectoryProps } from './SettingsDirectoryProps';
import { useState } from 'react';
import { useHelp } from '@/hooks/useHelp';
import { QuestionMarkCircleIcon } from '../ui/icons';

interface SettingsTabConfig {
  id: string;
  label: string;
}

interface SettingsGroupConfig {
  id: string;
  label: string;
  tabs: SettingsTabConfig[];
}

interface SettingsDirectoryPropsExtended extends SettingsDirectoryProps {
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  groups?: SettingsGroupConfig[];
  showWizard?: boolean;
  export?: () => void;
  import?: () => void;
  showDiff?: () => void;
  onWizardComplete?: () => void;
  onWizardSkip?: () => void;
}

const HelpIcon = ({ topicId }: { topicId?: string }) => (
  topicId ? <QuestionMarkCircleIcon className="w-4 h-4 ml-1 text-[var(--app-muted)]" /> : null
);

const SettingRow = ({ setting }: { setting: { id: string; label: string } }) => (
  <div className="setting-row" data-testid={`setting-${setting.id}`}>{setting.label}</div>
);

const SettingsWizard = ({ onComplete, onSkip }: { onComplete?: () => void; onSkip?: () => void }) => (
  <div data-testid="settings-wizard">
    <p>Setup Wizard</p>
    <button onClick={onComplete}>Complete</button>
    <button onClick={onSkip}>Skip</button>
  </div>
);

export function SettingsDirectory(props: SettingsDirectoryPropsExtended) {
  const [searchQuery, setSearchQuery] = useState(props.searchQuery ?? '');
  const help = useHelp();
  const groups = props.groups ?? [];

  return (
    <div className="settings-directory" data-testid="settings-directory">
      <input 
        type="search" 
        placeholder="Search settings…" 
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        data-testid="settings-search"
      />
      <div className="settings-groups">
        {groups.map((group: SettingsGroupConfig) => (
          <details key={group.id} open={true} data-testid={`settings-group-${group.id}`}>
            <summary>{group.label} <HelpIcon topicId={group.helpTopicId} /></summary>
            {group.tabs.map((tab: SettingsTabConfig) => <SettingRow key={tab.id} setting={tab} />)}
          </details>
        ))}
      </div>
      {props.showWizard && <SettingsWizard onComplete={props.onWizardComplete} onSkip={props.onWizardSkip} />}
      <div className="settings-actions">
        <button onClick={props.export} data-testid="settings-export">Export</button>
        <button onClick={props.import} data-testid="settings-import">Import</button>
        <button onClick={props.showDiff} data-testid="settings-diff">Show Diff</button>
      </div>
    </div>
  );
}