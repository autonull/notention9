import type { Property } from '../../types/index.js';
import { propertyNodeToHtml } from '../serialization.js';
import { parsePropertyBlock } from './strategies.js';
import { REGEX } from './constants.js';

/**
 * Macro to format a property into a semantic note tag.
 * Single source of truth for semantic property syntax.
 */
export const formatPropertyTag = (prop: Property | { key: string; operator?: string; values: string[] }): string => {
  const operator = prop.operator ?? 'is';
  return `[${prop.key}:${operator}:${prop.values.join(',')}]`;
};

/** The canonical serialization: an empty span that carries the property's data. */
const propertySpan = (prop: Property): string =>
  propertyNodeToHtml({ name: prop.key, operator: prop.operator, value: prop.values.join(', ') });

const PROPERTY_SPAN = /<span\s+[^>]*data-type=["']property["'][^>]*>[\s\S]*?<\/span>/g;
const PROPERTY_TAG = /\[([^\]]+:[^\]]+)\]/g;

interface Serialization {
  start: number;
  end: number;
  isSpan: boolean;
}

/** Finds where a property is serialized in note content. */
const findSerialization = (content: string, key: string): Serialization | null => {
  for (const match of content.matchAll(PROPERTY_SPAN)) {
    if (match[0].match(REGEX.SPAN_ATTR_NAME)?.[1] === key) {
      return { start: match.index!, end: match.index! + match[0].length, isSpan: true };
    }
  }
  for (const match of content.matchAll(PROPERTY_TAG)) {
    if (parsePropertyBlock(match[1])?.key === key) {
      return { start: match.index!, end: match.index! + match[0].length, isSpan: false };
    }
  }
  return null;
};

export const appendPropertyToText = (text: string, tag: string): string => {
  if (!tag) return text;
  return text.trim().endsWith('</p>') ? text.replace(/<\/p>$/, ` ${tag}</p>`) : `${text} ${tag}`;
};

/**
 * Replaces a property's serialization in note content.
 * The canonical form is an empty span; the bracket tag is the legacy macro.
 */
export const replacePropertyInContent = (content: string, oldProp: Property | null, newProp: Property | null): string => {
  if (!oldProp && !newProp) return content;
  const found = oldProp ? findSerialization(content, oldProp.key) : null;
  if (!found) return newProp ? appendPropertyToText(content, formatPropertyTag(newProp)) : content;
  const replacement = newProp ? (found.isSpan ? propertySpan(newProp) : formatPropertyTag(newProp)) : '';
  return content.slice(0, found.start) + replacement + content.slice(found.end);
};

/** Removes every serialization of a property from note content. */
export const removePropertyFromContent = (content: string, key: string): string => {
  let result = content;
  let found = findSerialization(result, key);
  while (found) {
    result = result.slice(0, found.start) + result.slice(found.end);
    found = findSerialization(result, key);
  }
  return result;
};
