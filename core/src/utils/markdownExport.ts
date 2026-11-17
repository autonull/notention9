import type { Note, Property } from '../types/index.js';

const escapeMarkdown = (val: string): string => {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/\|/g, '\\|');
};

const formatProperty = (prop: Property): string => {
  const values = prop.values.join(', ');
  const unit = prop.unit ? ` ${prop.unit}` : '';
  return `- **${prop.key}**${prop.operator !== 'is' ? ` (${prop.operator})` : ''}: ${values}${unit}`;
};

export const generateNotesMarkdown = (notes: Note[]): string => {
  if (notes.length === 0) return '';

  const lines: string[] = [
    '# Notention Notes Export',
    '',
    `Exported on ${new Date().toISOString()}`,
    `Total notes: ${notes.length}`,
    '',
    '---',
    '',
  ];

  for (const note of notes) {
    lines.push(`## ${escapeMarkdown(note.title || 'Untitled')}`);
    lines.push('');
    
    // Metadata
    lines.push('**Metadata:**');
    lines.push(`- **ID:** \`${note.id}\``);
    lines.push(`- **Created:** ${new Date(note.createdAt).toLocaleString()}`);
    lines.push(`- **Updated:** ${new Date(note.updatedAt).toLocaleString()}`);
    if (note.publishedAt) {
      lines.push(`- **Published:** ${new Date(note.publishedAt).toLocaleString()}`);
    }
    if (note.tags.length > 0) {
      lines.push(`- **Tags:** ${note.tags.map(t => `\`${escapeMarkdown(t)}\``).join(', ')}`);
    }
    if (note.status) {
      lines.push(`- **Status:** ${note.status}`);
    }
    if (note.deadline) {
      lines.push(`- **Deadline:** ${new Date(note.deadline).toLocaleString()}`);
    }
    if (note.priority !== 0) {
      lines.push(`- **Priority:** ${note.priority}`);
    }
    lines.push(`- **Privacy:** ${note.privacy}`);
    lines.push(`- **Source:** ${note.source.type} (${note.source.identifier})`);
    lines.push('');

    // Properties
    if (note.properties.length > 0) {
      lines.push('**Properties:**');
      for (const prop of note.properties) {
        lines.push(formatProperty(prop));
      }
      lines.push('');
    }

    // Content
    lines.push('**Content:**');
    lines.push('');
    // Convert HTML to plain text for markdown
    const plainContent = note.content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, "'");
    lines.push(plainContent);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
};

export const generateSingleNoteMarkdown = (note: Note): string => {
  return generateNotesMarkdown([note]);
};