import type { Note } from '../types/index.js';

const escapeCsvValue = (val: string | undefined | null): string => {
  if (val == null) return '';
  const str = String(val).replace(/"/g, '""');
  return /[,\n"]/.test(str) ? `"${str}"` : str;
};

export const generateNotesCSV = (notes: Note[]): string => {
  if (notes.length === 0) return '';

  const propKeys = Array.from(
    new Set(notes.flatMap(note => note.properties.map(p => p.key)))
  ).sort();

  const headers = ['id', 'title', 'created_at', 'tags', 'content', ...propKeys];

  const rows = notes.map(note => {
    const rowData = [
      note.id,
      note.title,
      note.createdAt,
      note.tags.join(';'),
      note.content.replace(/<[^>]*>/g, '').slice(0, 200),
    ];

    const props = propKeys.map(key => {
      const prop = note.properties.find(p => p.key === key);
      return prop ? prop.values.join(';') : '';
    });

    return [...rowData, ...props].map(escapeCsvValue).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
