import {ViewConfig} from '../types/ui';
import {
    ChatIcon,
    ClockIcon,
    CpuChipIcon,
    GitBranchIcon,
    HomeIcon,
    LightBulbIcon,
    MapIcon,
    NetworkIcon,
    NoteIcon,
    OntologyIcon,
    SettingsIcon,
    TrashIcon,
    UsersIcon,
} from '../components/common/icons';

export const NAV_ITEMS: ViewConfig[] = [
    {id: 'dashboard', label: 'Dashboard', icon: HomeIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'notes', label: 'Notes', icon: NoteIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'map', label: 'Map', icon: MapIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'network', label: 'Network', icon: NetworkIcon, showInMobile: true, badgeCountKey: 'notificationCount'},
    {id: 'chat', label: 'Chat', icon: ChatIcon, showInMobile: true, badgeCountKey: 'chatNotificationCount'},
    {id: 'actions', label: 'Actions', icon: LightBulbIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'graph', label: 'Graph', icon: GitBranchIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'ontology', label: 'Ontology', icon: OntologyIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'trash', label: 'Trash', icon: TrashIcon, showInMobile: true, badgeCountKey: undefined},
    {id: 'self', label: 'Self', icon: UsersIcon, showInMobile: true, badgeCountKey: undefined},
];

export const SETTINGS_VIEW: ViewConfig = {
    id: 'settings', label: 'Settings', icon: SettingsIcon, showInMobile: true
};
