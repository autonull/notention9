import {ViewConfig} from '../types/ui';
import {
    ChatIcon,
    ClockIcon,
    CpuChipIcon,
    HomeIcon,
    MapIcon,
    NetworkIcon,
    NoteIcon,
    OntologyIcon,
    SettingsIcon
} from '../components/common/icons';

export const NAV_ITEMS: ViewConfig[] = [
    {id: 'dashboard', label: 'Dashboard', icon: HomeIcon, showInMobile: true},
    {id: 'notes', label: 'Notes', icon: NoteIcon, showInMobile: true},
    {id: 'map', label: 'Map', icon: MapIcon, showInMobile: false},
    {id: 'time', label: 'Time', icon: ClockIcon, showInMobile: false},
    {id: 'network', label: 'Network', icon: NetworkIcon, showInMobile: false, badgeCountKey: 'notificationCount'},
    {id: 'chat', label: 'Chat', icon: ChatIcon, showInMobile: true, badgeCountKey: 'chatNotificationCount'},
    {id: 'ontology', label: 'Ontology', icon: OntologyIcon, showInMobile: false},
    {id: 'simulator', label: 'Simulator', icon: CpuChipIcon, showInMobile: false, requiresDeveloperMode: true},
];

export const SETTINGS_VIEW: ViewConfig = {
    id: 'settings', label: 'Settings', icon: SettingsIcon, showInMobile: false
};
