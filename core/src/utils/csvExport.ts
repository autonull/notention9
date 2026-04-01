import type { Note } from '../types/index.js';

export const generateNotesCSV = (notes: Note[]): string => {
    if (notes.length === 0) return '';

    // 1. Collect all unique property keys
    const propKeysSet = new Set<string>();
    notes.forEach(note => {
        note.properties.forEach(p => propKeysSet.add(p.key));
    });
    const propKeys = Array.from(propKeysSet).sort();

    // 2. Build Header
    const headers = ['id', 'title', 'created_at', 'tags', 'content', ...propKeys];

    // Helper to escape CSV values
    const escape = (val: string | undefined | null) => {
        if (val === undefined || val === null) return '';
        const str = String(val).replace(/"/g, '""'); // Escape double quotes
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str}"`;
        }
        return str;
    };

    // 3. Build Rows
    const rows = notes.map(note => {
        const rowData = [
            note.id,
            note.title,
            note.createdAt,
            note.tags.join(';'), // Semicolon separated tags
            note.content.replace(/<[^>]*>/g, '').slice(0, 200), // Plain text preview
        ];

        // Map properties
        propKeys.forEach(key => {
            const prop = note.properties.find(p => p.key === key);
            rowData.push(prop ? prop.values.join(';') : '');
        });

        return rowData.map(escape).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
};
