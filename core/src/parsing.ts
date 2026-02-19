import type { Property, ExtractedProperty, OntologyNode } from './types/index.js';
import { arePropertiesEqual } from './properties.js';
import { resolveAlias } from './propertyAliases.js';
import { expandMacro } from './composition.js';
import { getCanonicalKey } from './ontologyHelpers.js';

// Map symbolic operators to canonical operator names
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
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
]);

// Pre-compiled Regexes
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
};

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
export type PropertyParser = (content: string, ontology?: OntologyNode[]) => Property | null;

const resolveKey = (key: string, ontology?: OntologyNode[]): string =>
    ontology ? getCanonicalKey(key, ontology) : resolveAlias(key);

const createProperty = (rawKey: string, operator: string, value: string, ontology?: OntologyNode[], validate: boolean = true): Property | null => {
    const key = resolveKey(rawKey.trim(), ontology);

    if (validate) {
        if (!REGEX.VALID_KEY.test(key) || COMMON_WORDS.has(key.toLowerCase())) return null;
    }

    return {
        key,
        operator: operator.trim(),
        values: value.trim().split(',').map(v => v.trim())
    };
};

const parseColonFormat: PropertyParser = (content, ontology) => {
    const parts = content.split(':');
    if (parts.length < 2) return null;

    const rawKey = parts[0];
    const hasOperator = parts.length >= 3;
    const operator = hasOperator ? parts[1] : 'is';
    const value = hasOperator ? parts.slice(2).join(':') : parts[1];

    // Don't validate keys for explicit formats
    return createProperty(rawKey, operator, value, ontology, false);
};

const parseSymbolicFormat: PropertyParser = (content, ontology) => {
    const matchedSymbol = SYMBOLIC_REGEXES.find(({ regex }) => regex.test(content));

    if (matchedSymbol) {
        const symbolicMatch = content.match(matchedSymbol.regex)!;
        return createProperty(symbolicMatch[1], matchedSymbol.op, symbolicMatch[3], ontology, false);
    }
    return null;
};

const parseWordFormat: PropertyParser = (content, ontology) => {
    const wordOperatorMatch = content.match(REGEX.WORD_OP);

    if (wordOperatorMatch) {
        const [, rawKey, operator, value] = wordOperatorMatch;
        return createProperty(rawKey, operator, value, ontology, true);
    }

    const spaceMatch = content.match(REGEX.SPACE);
    if (spaceMatch) {
         const [, rawKey, value] = spaceMatch;
         return createProperty(rawKey, 'is', value, ontology, true);
    }

    return null;
};

const PARSERS: PropertyParser[] = [
    parseColonFormat,
    parseSymbolicFormat,
    parseWordFormat
];

const parsePropertyBlock = (content: string, ontology?: OntologyNode[]): Property | null => {
  for (const parser of PARSERS) {
    const result = parser(content, ontology);
    if (result) return result;
  }
  return null;
};

export const extractProperties = (text: string, ontology?: OntologyNode[]): ExtractedProperty[] => {
  const extracted: ExtractedProperty[] = [];

  for (const match of text.matchAll(REGEX.BRACKET)) {
    const parsed = parsePropertyBlock(match[1], ontology);
    if (parsed) {
      extracted.push({
        property: parsed,
        index: match.index!,
        length: match[0].length,
        originalText: match[0]
      });
    }
  }
  return extracted;
};

const extractMacros = (text: string): Property[] => {
    const properties: Property[] = [];
    for (const macroMatch of text.matchAll(REGEX.MACRO)) {
        properties.push(...expandMacro(macroMatch[1]));
    }
    return properties;
};

const extractHtmlSpans = (text: string): Property[] => {
    const properties: Property[] = [];
    for (const spanMatch of text.matchAll(REGEX.SPAN)) {
        const tag = spanMatch[0];
        const nameMatch = tag.match(REGEX.SPAN_ATTR_NAME);
        const opMatch = tag.match(REGEX.SPAN_ATTR_OP);
        const valMatch = tag.match(REGEX.SPAN_ATTR_VAL);

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

export const parseProperties = (text: string, ontology?: OntologyNode[]): Property[] => {
  const properties = extractProperties(text, ontology).map(e => e.property);
  properties.push(...extractMacros(text));
  properties.push(...extractHtmlSpans(text));
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
  // Replace only the last closing paragraph tag to inject the property inside it
  return text.trim().endsWith('</p>') ? text.replace(/<\/p>$/, ` ${tag}</p>`) : `${text} ${tag}`;
};

export const replacePropertyInString = (
  text: string,
  oldProp: Property | null,
  newProp: Property | null
): string => {
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
