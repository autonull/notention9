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

const COMMON_WORDS = new Set([
    'not', 'neither', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can',
    'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
]);

// Pre-compiled Regexes
const WORD_OP_REGEX = /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/i;
const GENERAL_SYM_REGEX = /^([^\s]+)\s*([<>=!]+)\s*(.+)$/;
const COLON_REGEX = /^([^\s]+):(.+)$/;
const SPACE_REGEX = /^([^\s]+)\s+(.+)$/;
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
type PropertyParser = (content: string) => Property | null;

const parseColonFormat: PropertyParser = (content) => {
    const colonParts = content.split(':');
    if (colonParts.length >= 3) {
        const key = resolveAlias(colonParts[0].trim());
        const operator = colonParts[1].trim();
        const value = colonParts.slice(2).join(':').trim();
        return {
            key,
            operator,
            values: value.split(',').map(v => v.trim())
        };
    } else if (colonParts.length === 2) {
        return {
            key: resolveAlias(colonParts[0].trim()),
            operator: 'is',
            values: colonParts[1].trim().split(',').map(v => v.trim())
        };
    }
    return null;
};

const parseSymbolicFormat: PropertyParser = (content) => {
    for (const { regex, op } of SYMBOLIC_REGEXES) {
        const symbolicMatch = content.match(regex);
        if (symbolicMatch) {
            return {
                key: resolveAlias(symbolicMatch[1].trim()),
                operator: op,
                values: symbolicMatch[3].trim().split(',').map(v => v.trim())
            };
        }
    }

    const generalMatch = content.match(GENERAL_SYM_REGEX);
    if (generalMatch) {
        const [, rawKey, operator, value] = generalMatch;
        const key = resolveAlias(rawKey.trim());

        let canonicalOperator = operator.trim();
        if (operator === '!=') canonicalOperator = 'is not';
        else if (operator === '<=') canonicalOperator = 'less than or equal';
        else if (operator === '>=') canonicalOperator = 'greater than or equal';

        return {
            key,
            operator: canonicalOperator,
            values: value.trim().split(',').map(v => v.trim())
        };
    }
    return null;
};

const parseWordFormat: PropertyParser = (content) => {
    const wordOperatorMatch = content.match(WORD_OP_REGEX);
    if (wordOperatorMatch) {
        const [, rawKey, operator, value] = wordOperatorMatch;
        const key = resolveAlias(rawKey.trim());

        if (!VALID_KEY_REGEX.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
            return null;
        }

        return {
            key,
            operator: operator.trim(),
            values: value.trim().split(',').map(v => v.trim())
        };
    }

    const spaceMatch = content.match(SPACE_REGEX);
    if (spaceMatch) {
         const [, rawKey, value] = spaceMatch;
         const key = resolveAlias(rawKey.trim());

         if (!VALID_KEY_REGEX.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
             return null;
         }

         return {
             key,
             operator: 'is',
             values: value.trim().split(',').map(v => v.trim())
         };
    }

    return null;
};

const PARSERS: PropertyParser[] = [
    parseColonFormat,
    parseSymbolicFormat,
    parseWordFormat
];

const parsePropertyBlock = (content: string): Property | null => {
  for (const parser of PARSERS) {
    const result = parser(content);
    if (result) return result;
  }
  return null;
};

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
    for (const macroMatch of text.matchAll(MACRO_REGEX)) {
        const macroName = macroMatch[1];
        const expandedProperties = expandMacro(macroName);
        properties.push(...expandedProperties);
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

export const parseProperties = (text: string): Property[] => {
  const properties: Property[] = extractProperties(text).map(e => e.property);

  properties.push(...extractMacros(text));
  properties.push(...extractHtmlSpans(text));

  return properties;
};

export const formatPropertyTag = (prop: Property): string => {
  const vals = prop.values.join(',');
  return `[${prop.key}:${prop.operator}:${vals}]`;
};

const findPropertyInText = (text: string, prop: Property): { index: number; length: number } | null => {
  const extracted = extractProperties(text);
  const found = extracted.find(ep => arePropertiesEqual(ep.property, prop));
  return found ? { index: found.index, length: found.length } : null;
};

const appendPropertyToText = (text: string, tag: string): string => {
  if (!tag) return text;
  const suffix = text.trim().endsWith('</p>') ? `<p>${tag}</p>` : ` ${tag}`;
  return text + suffix;
};

export const replacePropertyInString = (
  text: string,
  oldProp: Property | null,
  newProp: Property | null
): string => {
  if (!oldProp && !newProp) return text;

  const newTag = newProp ? formatPropertyTag(newProp) : '';

  if (!oldProp) {
      return appendPropertyToText(text, newTag);
  }

  const match = findPropertyInText(text, oldProp);
  if (match) {
    const prefix = text.substring(0, match.index);
    const suffix = text.substring(match.index + match.length);
    return prefix + newTag + suffix;
  }

  return appendPropertyToText(text, newTag);
};
