import type { Note, Property, NoteStatus } from '../types/index.js';
import { generateId } from '../utils/common.js';

export interface ParsedNote {
    title: string;
    content: string;
    tags: string[];
    properties: Property[];
    metadata: Record<string, string>;
    privacy: 'private' | 'public';
    createdAt: number;
    updatedAt: number;
    publishedAt?: number;
    deadline?: number;
    priority: number;
    status?: string;
}

export interface MarkdownImportResult {
    notes: ParsedNote[];
    errors: string[];
    warnings: string[];
}

const UNESCAPE_MAP: Record<string, string> = {
    '\\\\': '\\',
    '\\*': '*',
    '\\_': '_',
    '\\[': '[',
    '\\]': ']',
    '\\(': '(',
    '\\)': ')',
    '\\#': '#',
    '\\+': '+',
    '\\-': '-',
    '\\.': '.',
    '\\!': '!',
    '\\|': '|',
};

function parseLocaleDate(dateStr: string): number | null {
    const cleaned = dateStr.trim();
    const isoMatch = cleaned.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (isoMatch) {
        return new Date(cleaned).getTime();
    }
    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function unescapeMarkdown(val: string): string {
    return val.replace(/\\([\\*_\[\]\(\)\#\+\-\.\!\|])/g, (_, char) => UNESCAPE_MAP[`\\${char}`] ?? char);
}

function parsePropertyLine(line: string): Property | null {
    const match = line.match(/^-\s*\*\*(.+?)\*\*(?:\s*\((.+?)\))?:\s*(.+)$/);
    if (!match) return null;

    const key = unescapeMarkdown(match[1].trim());
    const operator = match[2] ? unescapeMarkdown(match[2].trim()) : 'is';
    const valuesPart = unescapeMarkdown(match[3].trim());

    const unitMatch = valuesPart.match(/^(.+?)\s+(\S+)$/);
    const values = unitMatch ? unitMatch[1].split(',').map(v => v.trim()) : valuesPart.split(',').map(v => v.trim());
    const unit = unitMatch ? unitMatch[2] : undefined;

    return { key, operator, values, unit };
}

function parseFrontmatter(content: string): { data: Record<string, string>; body: string; hasFrontmatter: boolean } {
    const lines = content.split('\n');
    if (lines[0]?.trim() !== '---') {
        return { data: {}, body: content, hasFrontmatter: false };
    }

    let i = 1;
    const data: Record<string, string> = {};
    while (i < lines.length && lines[i].trim() !== '---') {
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            data[key] = value;
        }
        i++;
    }

    const body = lines.slice(i + 1).join('\n');
    return { data, body, hasFrontmatter: true };
}

function parseObsidianFrontmatter(fm: Record<string, string>): Partial<ParsedNote> {
    const tags = fm.tags ? fm.tags.split(',').map(t => t.trim()) : [];
    const properties: Property[] = [];

    for (const [key, value] of Object.entries(fm)) {
        if (key === 'tags' || key === 'title' || key === 'created' || key === 'updated' || key === 'published' || key === 'deadline' || key === 'priority' || key === 'status' || key === 'privacy' || key === 'id') continue;

        const prop: Property = {
            key,
            operator: 'is',
            values: value.split(',').map(v => v.trim()),
        };
        properties.push(prop);
    }

    return {
        tags,
        properties,
        title: fm.title,
        createdAt: fm.created ? new Date(fm.created).getTime() : Date.now(),
        updatedAt: fm.updated ? new Date(fm.updated).getTime() : Date.now(),
        publishedAt: fm.published ? new Date(fm.published).getTime() : undefined,
        deadline: fm.deadline ? new Date(fm.deadline).getTime() : undefined,
        priority: fm.priority ? parseInt(fm.priority, 10) : 0,
        status: fm.status,
        privacy: (fm.privacy as 'private' | 'public') ?? 'private',
    };
}

export function parseNotentionMarkdown(markdown: string): MarkdownImportResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const notes: ParsedNote[] = [];

    const sections = markdown.split(/^---$/m);

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed || trimmed.startsWith('# Notention Notes Export')) continue;

        const lines = trimmed.split('\n');
        let title = 'Untitled';
        let content = '';
        let inContent = false;
        let inProperties = false;
        const properties: Property[] = [];
        const metadata: Record<string, string> = {};
        let currentProperty: Property | null = null;

        for (const line of lines) {
            if (line.startsWith('## ')) {
                title = unescapeMarkdown(line.slice(3).trim());
            } else if (line.startsWith('**Metadata:**')) {
                inProperties = false;
                continue;
            } else if (line.startsWith('**Properties:**')) {
                inProperties = true;
                continue;
            } else if (line.startsWith('**Content:**')) {
                inProperties = false;
                inContent = true;
                continue;
            } else if (inContent) {
                content += (content ? '\n' : '') + line;
            } else if (inProperties && line.startsWith('- **')) {
                const prop = parsePropertyLine(line);
                if (prop) properties.push(prop);
            } else if (!inProperties && line.startsWith('- **')) {
                const metaMatch = line.match(/^-\s*\*\*(.+?:)\*\*\s*(.+)$/);
                if (metaMatch) {
                    const key = metaMatch[1].replace(/:$/, '').trim();
                    let value = metaMatch[2].trim();

                    if (key === 'ID') {
                        value = value.replace(/^`|`$/g, '');
                        metadata.id = value;
                    } else if (key === 'Tags') {
                        metadata.Tags = value.replace(/`/g, '');
                    } else {
                        metadata[key] = value;
                    }
                }
            }
        }

        if (!content && !properties.length && !metadata.tags) {
            warnings.push(`Skipping empty note section`);
            continue;
        }

        const createdAt = metadata.Created ? parseLocaleDate(metadata.Created) ?? Date.now() : Date.now();
        const updatedAt = metadata.Updated ? parseLocaleDate(metadata.Updated) ?? createdAt : createdAt;
        const publishedAt = metadata.Published ? (parseLocaleDate(metadata.Published) ?? undefined) : undefined;
        const deadline = metadata.Deadline ? (parseLocaleDate(metadata.Deadline) ?? undefined) : undefined;
        const priority = metadata.Priority ? parseInt(metadata.Priority, 10) : 0;
        const status = metadata.Status;
        const privacy = (metadata.Privacy as 'private' | 'public') ?? 'private';
        const tags = metadata.Tags ? metadata.Tags.split(',').map(t => t.trim().replace(/`/g, '')) : [];

        notes.push({
            title,
            content: content.trim(),
            tags,
            properties,
            metadata,
            privacy,
            createdAt,
            updatedAt,
            publishedAt,
            deadline,
            priority,
            status,
        });
    }

    return { notes, errors, warnings };
}

export function parseMarkdownFile(content: string): MarkdownImportResult {
    const { data: frontmatter, body, hasFrontmatter } = parseFrontmatter(content);

    if (hasFrontmatter && (frontmatter.tags || frontmatter.title || Object.keys(frontmatter).some(k => !['id', 'created', 'updated', 'published', 'deadline', 'priority', 'status', 'privacy', 'tags'].includes(k.toLowerCase())))) {
        const obsidianNote = parseObsidianFrontmatter(frontmatter);
        const lines = body.trim().split('\n');
        let noteContent = body.trim();

        const properties: Property[] = [];
        if (obsidianNote.properties) {
            properties.push(...obsidianNote.properties);
        }

        return {
            notes: [{
                title: obsidianNote.title ?? 'Untitled',
                content: noteContent,
                tags: obsidianNote.tags ?? [],
                properties,
                metadata: frontmatter,
                privacy: obsidianNote.privacy ?? 'private',
                createdAt: obsidianNote.createdAt ?? Date.now(),
                updatedAt: obsidianNote.updatedAt ?? Date.now(),
                publishedAt: obsidianNote.publishedAt,
                deadline: obsidianNote.deadline,
                priority: obsidianNote.priority ?? 0,
                status: obsidianNote.status,
            }],
            errors: [],
            warnings: [],
        };
    }

    return parseNotentionMarkdown(content);
}

export function importNotesFromMarkdown(markdown: string): { notes: Note[]; errors: string[]; warnings: string[] } {
    const result = parseMarkdownFile(markdown);
    const notes: Note[] = [];

    for (const parsed of result.notes) {
        try {
            const note: Note = {
                id: parsed.metadata.id ?? generateId(),
                title: parsed.title,
                content: parsed.content,
                tags: parsed.tags,
                properties: parsed.properties,
                createdAt: new Date(parsed.createdAt).toISOString(),
                updatedAt: new Date(parsed.updatedAt).toISOString(),
                publishedAt: parsed.publishedAt ? new Date(parsed.publishedAt).toISOString() : undefined,
                deadline: parsed.deadline ? new Date(parsed.deadline).toISOString() : undefined,
                priority: parsed.priority,
                status: (parsed.status as NoteStatus) ?? 'open',
                privacy: parsed.privacy,
                source: {
                    type: 'import',
                    identifier: 'markdown-import',
                    timestamp: parsed.createdAt,
                },
            };
            notes.push(note);
        } catch (err) {
            result.errors.push(`Failed to create note "${parsed.title}": ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    return { notes, errors: result.errors, warnings: result.warnings };
}