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

const resolveKey = (key: string, ontology?: OntologyNode[]): string => {
    if (ontology) {
        return getCanonicalKey(key, ontology);
    }
    return resolveAlias(key);
}

const parseColonFormat: PropertyParser = (content, ontology) => {
    const colonParts = content.split(':');
    if (colonParts.length >= 3) {
        const key = resolveKey(colonParts[0].trim(), ontology);
        const operator = colonParts[1].trim();
        const value = colonParts.slice(2).join(':').trim();
        return {
            key,
            operator,
            values: value.split(',').map(v => v.trim())
        };
    } else if (colonParts.length === 2) {
        return {
            key: resolveKey(colonParts[0].trim(), ontology),
            operator: 'is',
            values: colonParts[1].trim().split(',').map(v => v.trim())
        };
    }
    return null;
};

const parseSymbolicFormat: PropertyParser = (content, ontology) => {
    const matchedSymbol = SYMBOLIC_REGEXES.find(({ regex }) => regex.test(content));

    if (matchedSymbol) {
        const symbolicMatch = content.match(matchedSymbol.regex)!;
        return {
            key: resolveKey(symbolicMatch[1].trim(), ontology),
            operator: matchedSymbol.op,
            values: symbolicMatch[3].trim().split(',').map(v => v.trim())
        };
    }
    return null;
};

const parseWordFormat: PropertyParser = (content, ontology) => {
    const wordOperatorMatch = content.match(REGEX.WORD_OP);
    if (wordOperatorMatch) {
        const [, rawKey, operator, value] = wordOperatorMatch;
        const key = resolveKey(rawKey.trim(), ontology);

        if (!REGEX.VALID_KEY.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
            return null;
        }

        return {
            key,
            operator: operator.trim(),
            values: value.trim().split(',').map(v => v.trim())
        };
    }

    const spaceMatch = content.match(REGEX.SPACE);
    if (spaceMatch) {
         const [, rawKey, value] = spaceMatch;
         const key = resolveKey(rawKey.trim(), ontology);

         if (!REGEX.VALID_KEY.test(key) || COMMON_WORDS.has(key.toLowerCase())) {
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
    const content = match[1];
    const parsed = parsePropertyBlock(content, ontology);
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
    for (const macroMatch of text.matchAll(REGEX.MACRO)) {
        const macroName = macroMatch[1];
        const expandedProperties = expandMacro(macroName);
        properties.push(...expandedProperties);
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
  const properties: Property[] = extractProperties(text, ontology).map(e => e.property);

  properties.push(...extractMacros(text));
  properties.push(...extractHtmlSpans(text));

  return properties;
};

export const formatPropertyTag = (prop: Property): string => {
  const vals = prop.values.join(',');
  return `[${prop.key}:${prop.operator}:${vals}]`;
};

const findPropertyInText = (text: string, prop: Property): { index: number; length: number } | null => {
  // Finding property in text logic might rely on equality check which relies on keys
  // This is tricky if keys are normalized.
  const extracted = extractProperties(text); // No ontology here, finding raw?
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

  if (oldProp) {
    const match = findPropertyInText(text, oldProp);
    if (match) {
      return `${text.substring(0, match.index)}${newTag}${text.substring(match.index + match.length)}`;
    }
  }

  return appendPropertyToText(text, newTag);
};
