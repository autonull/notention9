import {parseProperties, propertyToHtml} from '@notention/core';

const TASK_KEYWORDS = ['Create Task', 'Todo List', 'Shopping List'];

export const applyTaskSuggestion = (content: string, suggestionText: string): string | null => {
    if (!TASK_KEYWORDS.some(keyword => suggestionText.includes(keyword))) return null;

    const hasPending = parseProperties(content).some(p => p.key === 'status' && p.values.includes('pending'));
    if (hasPending) return null;

    return `${content.trim()}\n\n${propertyToHtml({key: 'status', operator: 'is', values: ['pending']})}`;
};
