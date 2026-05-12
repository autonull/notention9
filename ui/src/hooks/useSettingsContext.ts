import { SettingsContext } from '../components/contexts/SettingsContext';
import { createContextHook } from '../utils/ui';

export const useSettings = createContextHook(SettingsContext, 'useSettings', 'SettingsProvider');
