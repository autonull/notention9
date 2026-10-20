import type { Property, OntologyNode } from '../../types/index.js';
import { expandMacro } from '../../utils/composition.js';
import { parseValues } from './helpers.js';
import { parsePropertyBlock } from './strategies.js';
import { REGEX, SYMBOLIC_REGEXES } from './constants.js';
import type { ExtractedProperty } from './types.js';

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

export const parseProperties = (text: string, ontology?: OntologyNode[]): Property[] => {
  const properties = extractProperties(text, ontology).map(e => e.property);
  properties.push(...extractMacros(text), ...extractHtmlSpans(text));
  return properties;
};