import { parseProperties, replacePropertyInString } from '@notention/core';

const PROPERTY_REGEX = /\[(.*?):(.*?):(.*?)\]/;
const TASK_KEYWORDS = ['Create Task', 'Todo List', 'Shopping List'];
const PENDING_STATUS = '[status:is:pending]';

export const applyPropertySuggestion = (content: string, suggestionText: string): string | null => {
    const propertyMatch = suggestionText.match(PROPERTY_REGEX);
    if (!propertyMatch) return null;

    const tag = propertyMatch[0];
    const newProperty = parseProperties(tag)[0];

    if (!newProperty) return null;

    const existingProps = parseProperties(content);
    const existingProp = existingProps.find(p => p.key === newProperty.key);

    if (existingProp) {
        return replacePropertyInString(content, existingProp, newProperty);
    } else {
        return content.trim() + `\n\n${tag}`;
    }
};

export const applyTaskSuggestion = (content: string, suggestionText: string): string | null => {
    if (TASK_KEYWORDS.some(s => suggestionText.includes(s))) {
        if (!content.includes(PENDING_STATUS)) {
            return content.trim() + `\n\n${PENDING_STATUS}`;
        }
    }
    return null;
};
