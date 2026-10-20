import type { Property } from '../../types/index.js';
import { arePropertiesEqual } from '../properties.js';
import { extractProperties } from './extractors.js';

/**
 * Macro to format a property into a semantic note tag.
 * Single source of truth for semantic property syntax.
 */
export const formatPropertyTag = (prop: Property | { key: string; operator?: string; values: string[] }): string => {
  const operator = prop.operator ?? 'is';
  return `[${prop.key}:${operator}:${prop.values.join(',')}]`;
};

const findPropertyInText = (text: string, prop: Property): { index: number; length: number } | null => {
  const extracted = extractProperties(text);
  const found = extracted.find(ep => arePropertiesEqual(ep.property, prop));
  return found ? { index: found.index, length: found.length } : null;
};

export const appendPropertyToText = (text: string, tag: string): string => {
  if (!tag) return text;
  return text.trim().endsWith('</p>') ? text.replace(/<\/p>$/, ` ${tag}</p>`) : `${text} ${tag}`;
};

export const replacePropertyInString = (text: string, oldProp: Property | null, newProp: Property | null): string => {
  if (!oldProp && !newProp) return text;
  const newTag = newProp ? formatPropertyTag(newProp) : '';
  if (oldProp) {
    const match = findPropertyInText(text, oldProp);
    if (match) {
      return `${text.substring(0, match.index)}${newTag}${text.substring(match.index + match.length)}`;
    }
  }
  return appendPropertyToText(text, newTag);
};