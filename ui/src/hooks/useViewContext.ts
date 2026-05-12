import { ViewContext } from '../components/contexts/ViewContext';
import { createContextHook } from '../utils/ui';

export const useView = createContextHook(ViewContext, 'useView', 'ViewProvider');
