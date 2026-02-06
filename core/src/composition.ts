import { Property } from './types/index.js';

export const MACROS: Record<string, Property[]> = {
    'freelancer': [
        { key: 'role', operator: 'is', values: ['freelancer'] },
        { key: 'available', operator: 'is', values: ['true'] }
    ],
    'urgent': [
        { key: 'priority', operator: 'is', values: ['high'] },
        { key: 'status', operator: 'is', values: ['active'] }
    ],
    'meeting': [
        { key: 'type', operator: 'is', values: ['meeting'] },
        { key: 'participants', operator: 'is', values: ['required'] } // Placeholder
    ]
};

export const expandMacro = (macroName: string): Property[] => {
    const key = macroName.toLowerCase();
    return MACROS[key] || [];
};
