import type { Property, ExtractedProperty, OntologyNode } from './types/index.js';
import { arePropertiesEqual } from './properties.js';
import { resolveAlias } from './propertyAliases.js';
import { expandMacro } from './composition.js';
import { getCanonicalKey } from './ontologyHelpers.js';

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
  'not', 'neither', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

export const REGEX = {
  WORD_OP: /^([^\s]+)\s+(is|contains|before|after|less than|greater than|between|range|not)\s+(.+)$/i,
  COLON: /^([^\s]+):(.+)$/,
  SPACE: /^([^\s]+)\s+(.+)$/,
  VALID_KEY: /^[a-zA-Z][a-zA-Z0-9_.-]*$/,
  BRACKET: /\[([^\]]+)\]/g,
  MACRO: /@([a-zA-Z0-9_]+)/g,
  SPAN: /<span\s+[^>]*data-type=["']property["'][^>]*>/g,
  SPAN_ATTR_NAME: /data-name=["']([^"']+)["']/,
  SPAN_ATTR_OP: /data-operator=["']([^"']+)["']/,
  SPAN_ATTR_VAL: /data-value=["']([^"']+)["']/,
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

const createProperty = (rawKey: string, operator: string, value: string, ontology?: OntologyNode[], validate = true): Property | null => {
  const key = resolveKey(rawKey.trim(), ontology);
  if (validate && !isValidKey(key)) return null;
  return { key, operator: operator.trim(), values: value.trim().split(',').map(v => v.trim()) };
};

export interface PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null;
}

export class ColonFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    const parts = content.split(':');
    if (parts.length < 2) return null;
    const rawKey = parts[0];
    const hasOperator = parts.length >= 3;
    const operator = hasOperator ? parts[1] : 'is';
    const value = hasOperator ? parts.slice(2).join(':') : parts[1];
    return createProperty(rawKey, operator, value, ontology, false);
  }
}

export class SymbolicFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    for (const { regex, op } of SYMBOLIC_REGEXES) {
      const match = content.match(regex);
      if (match) return createProperty(match[1], op, match[3], ontology, false);
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

export const extractProperties = (text: string, ontology?: OntologyNode[]): ExtractedProperty[] =>
  Array.from(text.matchAll(REGEX.BRACKET))
    .flatMap<ExtractedProperty>(match => {
      const parsed = parsePropertyBlock(match[1], ontology);
      return parsed ? [{ property: parsed, index: match.index!, length: match[0].length, originalText: match[0] }] : [];
    });

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
        return [{ key: nameMatch[1], operator: opMatch?.[1] ?? 'is', values: valMatch[1].split(',').map(v => v.trim()) }];
      }
      return [];
    });

export const parseProperties = (text: string, ontology?: OntologyNode[]): Property[] => {
  const properties = extractProperties(text, ontology).map(e => e.property);
  properties.push(...extractMacros(text), ...extractHtmlSpans(text));
  return properties;
};

export const formatPropertyTag = (prop: Property): string =>
  `[${prop.key}:${prop.operator}:${prop.values.join(',')}]`;

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
