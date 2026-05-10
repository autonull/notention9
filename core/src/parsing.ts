import type { Property, ExtractedProperty, OntologyNode } from './types/index.js';
import { arePropertiesEqual } from './properties.js';
import { resolveAlias } from './propertyAliases.js';
import { expandMacro } from './composition.js';
import { getCanonicalKey } from './ontologyHelpers.js';
import { Logger } from './utils/logging.js';

export const SYMBOL_TO_OP: Record<string, string> = {
  '<=': 'less than or equal',
  '>=': 'greater than or equal',
  '<': 'less than',
  '>': 'greater than',
  '=': 'is',
  ':': 'is',
  '!=': 'is not',
  '≈': 'is near',
  '∋': 'contains',
};

const COMMON_WORDS = new Set([
  'not', 'neither', 'the', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those',
  'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

export const REGEX = {
  WORD_OP: /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/i,
  COLON: /^([^\s]+):(.+)$/,
  PHONE: /(\+?\d{10,15})/,
  EMAIL: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  BUDGET: /(?:\$|USD\s*)(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|dollars?)/i,
  SPACE: /^([^\s]+)\s+(.+)$/,
  VALID_KEY: /^[a-zA-Z[\]][a-zA-Z0-9_.[\]\s-]*$/,
  BRACKET: /\[([^\]]+)\]/g,
  MACRO: /@([a-zA-Z0-9_]+)/g,
  SPAN: /<span\s+[^>]*data-type=["']property["'][^>]*>/g,
  SPAN_ATTR_NAME: /data-name=["']([^"']+)["']/,
  SPAN_ATTR_OP: /data-operator=["']([^"']+)["']/,
  SPAN_ATTR_VAL: /data-value=["']([^"']+)["']/,
  HTML_TAGS: /<[^>]+>/g,
  BLOCK_TAGS: /<\/(p|div|h[1-6]|li|blockquote|pre)>/gi,
  BR_TAGS: /<br\s*\/?>/gi,
} as const;

const SYMBOLIC_REGEXES = Object.entries(SYMBOL_TO_OP)
  .sort(([a], [b]) => b.length - a.length)
  .map(([sym, op]) => ({
    regex: new RegExp(`^(.+?)\\s*(${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*(.*)$`),
    op,
  }));

const resolveKey = (key: string, ontology?: OntologyNode[]): string =>
  ontology ? getCanonicalKey(key, ontology) : resolveAlias(key);

const isValidKey = (key: string): boolean => REGEX.VALID_KEY.test(key) && !COMMON_WORDS.has(key.toLowerCase());

const logger = Logger.getInstance();

export const parseValues = (raw: string): string[] =>
  raw.trim().split(',').map(v => v.trim());

const createProperty = (rawKey: string, operator: string, value: string, ontology?: OntologyNode[], validate = true): Property | null => {
  const key = resolveKey(rawKey.trim(), ontology);
  if (validate && !isValidKey(key)) {
    logger.debug('Property parse skipped', { rawKey, reason: 'invalid key', isCommonWord: COMMON_WORDS.has(key.toLowerCase()), invalidFormat: !REGEX.VALID_KEY.test(key) });
    return null;
  }
  return { key, operator: operator.trim(), values: parseValues(value) };
};

export interface PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null;
}

export class ColonFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    const parts = content.split(':');
    if (parts.length < 2) return null;
    const rawKey = parts[0].trim();
    if (!rawKey) return null;
    const hasOperator = parts.length >= 3;
    const operator = hasOperator ? parts[1] : 'is';
    const value = hasOperator ? parts.slice(2).join(':') : parts[1];
    return createProperty(rawKey, operator, value, ontology, true);
  }
}

export class SymbolicFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    for (const { regex, op } of SYMBOLIC_REGEXES) {
      const match = content.match(regex);
      if (match) return createProperty(match[1], op, match[3], ontology, true);
    }
    return null;
  }
}

export class WordFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    const wordMatch = content.match(REGEX.WORD_OP);
    if (wordMatch) {
      const [, rawKey, operator, value] = wordMatch;
      return createProperty(rawKey, operator, value, ontology, true);
    }
    const spaceMatch = content.match(REGEX.SPACE);
    if (spaceMatch) {
      const [, rawKey, value] = spaceMatch;
      return createProperty(rawKey, 'is', value, ontology, true);
    }
    return null;
  }
}

export class PropertyBlockParser {
  private readonly strategies: PropertyParserStrategy[] = [
    new ColonFormatStrategy(),
    new SymbolicFormatStrategy(),
    new WordFormatStrategy(),
  ];

  parse(content: string, ontology?: OntologyNode[]): Property | null {
    for (const strategy of this.strategies) {
      const result = strategy.parse(content, ontology);
      if (result) return result;
    }
    return null;
  }
}

const parserInstance = new PropertyBlockParser();

const parsePropertyBlock = (content: string, ontology?: OntologyNode[]): Property | null =>
  parserInstance.parse(content, ontology);

export const extractProperties = (text: string, ontology?: OntologyNode[]): ExtractedProperty[] => {
  const matches = Array.from(text.matchAll(REGEX.BRACKET));

  return matches.flatMap((match) => {
    const content = match[1];
    const parsed = parsePropertyBlock(content, ontology);

    if (parsed) {
      return [{ property: parsed, index: match.index!, length: match[0].length, originalText: match[0] }];
    }

    // Handle nested or malformed brackets [[key:is:val]]
    const innerMatch = content.match(/\[([^\[\]]+)\]/);
    if (innerMatch) {
      const innerParsed = parsePropertyBlock(innerMatch[1], ontology);
      if (innerParsed) {
        return [{
          property: innerParsed,
          index: match.index! + innerMatch.index! + 1,
          length: innerMatch[0].length,
          originalText: innerMatch[0]
        }];
      }
    } else if (content.startsWith('[')) {
      const innerParsed = parsePropertyBlock(content.substring(1), ontology);
      if (innerParsed) {
        return [{
          property: innerParsed,
          index: match.index! + 1,
          length: match[0].length - 1,
          originalText: match[0].substring(1)
        }];
      }
    }

    return [];
  });
};

const extractMacros = (text: string): Property[] =>
  Array.from(text.matchAll(REGEX.MACRO)).flatMap(m => expandMacro(m[1]));

const extractHtmlSpans = (text: string): Property[] =>
  Array.from(text.matchAll(REGEX.SPAN))
    .flatMap(spanMatch => {
      const tag = spanMatch[0];
      const nameMatch = tag.match(REGEX.SPAN_ATTR_NAME);
      const opMatch = tag.match(REGEX.SPAN_ATTR_OP);
      const valMatch = tag.match(REGEX.SPAN_ATTR_VAL);
      if (nameMatch && valMatch) {
        return [{ key: nameMatch[1], operator: opMatch?.[1] ?? 'is', values: parseValues(valMatch[1]) }];
      }
      return [];
    });

export const parseProperties = (text: string, ontology?: OntologyNode[]): Property[] => {
  const properties = extractProperties(text, ontology).map(e => e.property);
  properties.push(...extractMacros(text), ...extractHtmlSpans(text));
  return properties;
};

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

const appendPropertyToText = (text: string, tag: string): string => {
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
