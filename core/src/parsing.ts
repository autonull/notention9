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

// Pre-compiled Regexes
const WORD_OP_REGEX = /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/;
const GENERAL_SYM_REGEX = /^([^\s]+)\s*([<>=!]+)\s*(.+)$/;
const SIMPLE_COLON_REGEX = /^([^\s]+):(.+)$/;
const SIMPLE_SPACE_REGEX = /^([^\s]+)\s+(.+)$/;
const VALID_KEY_REGEX = /^[a-zA-Z][a-zA-Z0-9_.-]*$/;
const BRACKET_REGEX = /\[([^\]]+)\]/g;
const MACRO_REGEX = /@([a-zA-Z0-9_]+)/g;
const SPAN_REGEX = /<span\s+[^>]*data-type=["']property["'][^>]*>/g;
const SPAN_ATTR_NAME = /data-name=["']([^"']+)["']/;
const SPAN_ATTR_OP = /data-operator=["']([^"']+)["']/;
const SPAN_ATTR_VAL = /data-value=["']([^"']+)["']/;

// Pre-compute symbolic regexes
const SYMBOLIC_REGEXES = Object.keys(SYMBOL_TO_OP)
  .sort((a, b) => b.length - a.length)
  .map(sym => {
      const escapedSym = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
          regex: new RegExp(`^(.+?)\\s*(${escapedSym})\\s*(.*)$`),
          op: SYMBOL_TO_OP[sym]
      };
  });

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
    name: 'Symbolic Operators',
    parse: (content: string) => {
      for (const { regex, op } of SYMBOLIC_REGEXES) {
        const symMatch = content.match(regex);
        if (symMatch) {
          return {
            key: resolveAlias(symMatch[1].trim()),
            operator: op,
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
      const match = content.match(WORD_OP_REGEX);
      if (!match) return null;

      const [, rawKey, op, val] = match;
      const key = resolveAlias(rawKey.trim());

      if (!VALID_KEY_REGEX.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
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
      const match = content.match(GENERAL_SYM_REGEX);
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
      const match = content.match(SIMPLE_COLON_REGEX);
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
      const match = content.match(SIMPLE_SPACE_REGEX);
      if (!match) return null;

      const [, rawKey, val] = match;
      const key = resolveAlias(rawKey.trim());

      if (!VALID_KEY_REGEX.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
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

  for (const match of text.matchAll(BRACKET_REGEX)) {
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

const extractMacros = (text: string): Property[] => {
    const properties: Property[] = [];
    for (const match of text.matchAll(MACRO_REGEX)) {
        const macroName = match[1];
        const expanded = expandMacro(macroName);
        properties.push(...expanded);
    }
    return properties;
};

const extractHtmlSpans = (text: string): Property[] => {
    const properties: Property[] = [];
    for (const spanMatch of text.matchAll(SPAN_REGEX)) {
        const tag = spanMatch[0];
        const nameMatch = tag.match(SPAN_ATTR_NAME);
        const opMatch = tag.match(SPAN_ATTR_OP);
        const valMatch = tag.match(SPAN_ATTR_VAL);

        if (nameMatch && valMatch) {
            properties.push({
                key: nameMatch[1],
                operator: opMatch ? opMatch[1] : 'is',
                values: valMatch[1].split(',').map(v => v.trim())
            });
        }
    }
    return properties;
}

/**
 * Parses a raw text string and extracts semantic properties.
 * Supports standard format [key:op:value] and symbolic format [key < value].
 * Also supports parsing HTML Chip syntax for backward compatibility or processing.
 */
export const parseProperties = (text: string): Property[] => {
  const extracted = extractProperties(text);
  const properties: Property[] = extracted.map(e => e.property);

  properties.push(...extractMacros(text));
  properties.push(...extractHtmlSpans(text));

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
  for (const match of text.matchAll(BRACKET_REGEX)) {
    const content = match[1];
    const parsed = parsePropertyBlock(content);

    if (parsed && arePropertiesEqual(parsed, prop)) {
      return { index: match.index, length: match[0].length };
    }
  }
  return null;
};

const appendPropertyToText = (text: string, tag: string): string => {
  if (!tag) return text;
  const suffix = text.trim().endsWith('</p>') ? `<p>${tag}</p>` : ` ${tag}`;
  return text + suffix;
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

  // Append if no old property
  if (!oldProp) {
      return appendPropertyToText(text, newTag);
  }

  // Find and Replace/Delete
  const match = findPropertyInText(text, oldProp);
  if (match) {
    const prefix = text.substring(0, match.index);
    const suffix = text.substring(match.index + match.length);
    return prefix + newTag + suffix;
  }

  // Fallback: Append if not found but new tag exists
  return appendPropertyToText(text, newTag);
};
