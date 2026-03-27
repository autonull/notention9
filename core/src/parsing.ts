import type { Property, ExtractedProperty } from './types/index.js';
import { arePropertiesEqual } from './properties.js';
import { resolveAlias } from './propertyAliases.js';
import { expandMacro } from './composition.js';

// Map symbolic operators to canonical operator names
export const SYMBOL_TO_OP: Record<string, string> = {
  '<': 'less than',
  '>': 'greater than',
  '=': 'is',
  ':': 'is',
  '!=': 'is not',
  '≈': 'is near',
  '∋': 'contains',
};

const COMMON_WORDS = new Set(['not', 'neither', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);

// Strategy Pattern for Property Parsing
interface PropertyParser {
  name: string;
  parse: (content: string) => Property | null;
}

const PARSERS: PropertyParser[] = [
  {
    name: 'Standard Colon Format',
    parse: (content: string) => {
      const colons = content.split(':');
      if (colons.length < 3) return null;

      const key = resolveAlias(colons[0].trim());
      const op = colons[1].trim();
      const val = colons.slice(2).join(':').trim();

      return {
        key,
        operator: op,
        values: val.split(',').map(v => v.trim())
      };
    }
  },
  {
    name: 'Nested Properties',
    parse: (content: string) => {
      // Supports key.subkey:val
      // Matches alphanumeric + dots, then colon, then value
      // Simplistic: assumes implicit 'is' if only one colon? No, wait.
      // Guide says: [location.city:is:Austin] -> Standard Parser actually handles this if key allows dots!
      // Let's verify standard regex. standard is split(':').
      // If content is "location.city:is:Austin", split(:) gives ["location.city", "is", "Austin"].
      // So Standard Parser ALREADY handles nested keys if we don't block them.

      // However, let's look at "Word Operators" parser.
      // Regex: /^([^\s]+)\s+.../
      // [location.city is Austin] -> matches key="location.city"

      return null; // Logic is covered by other parsers if we rely on simple string keys
    }
  },
  {
    name: 'Symbolic Operators',
    parse: (content: string) => {
      const symbols = Object.keys(SYMBOL_TO_OP).sort((a, b) => b.length - a.length);
      for (const sym of symbols) {
        const escapedSym = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const symRegex = new RegExp(`^(.+?)\\s*(${escapedSym})\\s*(.*)$`);
        const symMatch = content.match(symRegex);

        if (symMatch) {
          return {
            key: resolveAlias(symMatch[1].trim()),
            operator: SYMBOL_TO_OP[symMatch[2]],
            values: symMatch[3].trim().split(',').map(v => v.trim())
          };
        }
      }
      return null;
    }
  },
  {
    name: 'Word Operators',
    parse: (content: string) => {
      const wordOpRegex = /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/;
      const match = content.match(wordOpRegex);
      if (!match) return null;

      const [, rawKey, op, val] = match;
      const key = resolveAlias(rawKey.trim());

      // Validation: Key must be alphanumeric+dots/valid
      // Updated regex to allow dots for nested keys
      if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
        return null;
      }

      return {
        key,
        operator: op.trim(),
        values: val.trim().split(',').map(v => v.trim())
      };
    }
  },
  {
    name: 'General Symbols',
    parse: (content: string) => {
      const generalSymRegex = /^([^\s]+)\s*([<>=!]+)\s*(.+)$/;
      const match = content.match(generalSymRegex);
      if (!match) return null;

      const [, rawKey, op, val] = match;
      const key = resolveAlias(rawKey.trim());

      let canonicalOp = op.trim();
      if (op === '!=') canonicalOp = 'is not';
      else if (op === '<=') canonicalOp = 'less than or equal';
      else if (op === '>=') canonicalOp = 'greater than or equal';

      return {
        key,
        operator: canonicalOp,
        values: val.trim().split(',').map(v => v.trim())
      };
    }
  },
  {
    name: 'Simple Colon (Backcompat)',
    parse: (content: string) => {
      const simpleColonRegex = /^([^\s]+):(.+)$/;
      const match = content.match(simpleColonRegex);
      if (!match) return null;

      return {
        key: resolveAlias(match[1].trim()),
        operator: 'is',
        values: match[2].trim().split(',').map(v => v.trim())
      };
    }
  },
  {
    name: 'Simple Space',
    parse: (content: string) => {
      const simpleSpaceRegex = /^([^\s]+)\s+(.+)$/;
      const match = content.match(simpleSpaceRegex);
      if (!match) return null;

      const [, rawKey, val] = match;
      const key = resolveAlias(rawKey.trim());

      if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
        return null;
      }

      return {
        key,
        operator: 'is',
        values: val.trim().split(',').map(v => v.trim())
      };
    }
  }
];

/**
 * Helper to parse the content inside brackets [content]
 */
const parsePropertyBlock = (content: string): Property | null => {
  for (const parser of PARSERS) {
    const result = parser.parse(content);
    if (result) return result;
  }
  return null;
};

/**
 * Parses a raw text string and extracts semantic properties from bracket syntax.
 * Supports standard format [key:op:value] and symbolic format [key < value].
 */
export const extractProperties = (text: string): ExtractedProperty[] => {
  const extracted: ExtractedProperty[] = [];
  const bracketRegex = /\[([^\]]+)\]/g;

  for (const match of text.matchAll(bracketRegex)) {
    const content = match[1];
    const parsed = parsePropertyBlock(content);
    if (parsed) {
      extracted.push({
        property: parsed,
        index: match.index,
        length: match[0].length,
        originalText: match[0]
      });
    }
  }
  return extracted;
};

/**
 * Parses a raw text string and extracts semantic properties.
 * Supports standard format [key:op:value] and symbolic format [key < value].
 * Also supports parsing HTML Chip syntax for backward compatibility or processing.
 */
export const parseProperties = (text: string): Property[] => {
  const properties: Property[] = [];

  // 1. Parse standard [...] bracket syntax
  const extracted = extractProperties(text);
  properties.push(...extracted.map(e => e.property));

  // 1a. Parse Macros: @macroName
  const macroRegex = /@([a-zA-Z0-9_]+)/g;
  for (const match of text.matchAll(macroRegex)) {
    const macroName = match[1];
    const expanded = expandMacro(macroName);
    properties.push(...expanded);
  }

  // 2. Parse HTML Chip syntax: <span data-type="property" ...>
  const spanRegex = /<span\s+[^>]*data-type=["']property["'][^>]*>/g;

  for (const spanMatch of text.matchAll(spanRegex)) {
    const tag = spanMatch[0];

    // Extract attributes
    const nameMatch = tag.match(/data-name=["']([^"']+)["']/);
    const opMatch = tag.match(/data-operator=["']([^"']+)["']/);
    const valMatch = tag.match(/data-value=["']([^"']+)["']/);

    if (nameMatch && valMatch) {
      properties.push({
        key: nameMatch[1],
        operator: opMatch ? opMatch[1] : 'is',
        values: valMatch[1].split(',').map(v => v.trim())
      });
    }
  }

  return properties;
};

/**
 * Formats a property into its standard string representation.
 */
export const formatPropertyTag = (prop: Property): string => {
  const vals = prop.values.join(',');
  return `[${prop.key}:${prop.operator}:${vals}]`;
};

/**
 * Finds the index and length of a property in the text.
 */
const findPropertyInText = (text: string, prop: Property): { index: number; length: number } | null => {
  const bracketRegex = /\[([^\]]+)\]/g;

  for (const match of text.matchAll(bracketRegex)) {
    const content = match[1];
    const parsed = parsePropertyBlock(content);

    if (parsed && arePropertiesEqual(parsed, prop)) {
      return { index: match.index, length: match[0].length };
    }
  }
  return null;
};

/**
 * Replaces a property in a text string (or HTML string) with a new one.
 * If oldProp is provided, it attempts to find and replace it.
 * If newProp is null, it removes the found property.
 * If oldProp is null, it appends newProp to the end.
 */
export const replacePropertyInString = (
  text: string,
  oldProp: Property | null,
  newProp: Property | null
): string => {
  if (!oldProp && !newProp) return text;

  const newTag = newProp ? formatPropertyTag(newProp) : '';

  // Case 1: Append (no old property to replace)
  if (!oldProp) {
    return text + (text.trim().endsWith('</p>') ? `<p>${newTag}</p>` : ` ${newTag}`);
  }

  // Case 2: Find and Replace/Delete
  const match = findPropertyInText(text, oldProp);

  if (match) {
    const prefix = text.substring(0, match.index);
    const suffix = text.substring(match.index + match.length);
    return prefix + newTag + suffix;
  }

  // Case 3: Old property not found, but we have a new one (Fallback: Append)
  if (newTag) {
    return text + (text.trim().endsWith('</p>') ? `<p>${newTag}</p>` : ` ${newTag}`);
  }

  return text;
};
