import { ToastContext } from '../components/contexts/ToastContext';
import { createContextHook } from '../utils/ui';

export const useToast = createContextHook(ToastContext, 'useToast', 'ToastProvider');
