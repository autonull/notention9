import type { Property } from './types';
import { arePropertiesEqual } from './properties';

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

export interface ExtractedProperty {
    property: Property;
    index: number;
    length: number;
    originalText: string;
}

/**
 * Parses a raw text string and extracts semantic properties from bracket syntax.
 * Supports standard format [key:op:value] and symbolic format [key < value].
 */
export const extractProperties = (text: string): ExtractedProperty[] => {
  const extracted: ExtractedProperty[] = [];
  const bracketRegex = /\[([^\]]+)\]/g;
  let match;

  while ((match = bracketRegex.exec(text)) !== null) {
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

  // 2. Parse HTML Chip syntax: <span data-type="property" ...>
  // We use a regex that is robust enough for simple attributes
  const spanRegex = /<span\s+[^>]*data-type=["']property["'][^>]*>/g;
  let spanMatch;

  while ((spanMatch = spanRegex.exec(text)) !== null) {
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
 * Helper to parse the content inside brackets [content]
 */
const parsePropertyBlock = (content: string): Property | null => {
   // Check if it matches standard format (two colons)
    // heuristic: count colons
    const colons = content.split(':');
    if (colons.length >= 3) {
      const key = colons[0].trim();
      const op = colons[1].trim();
      const val = colons.slice(2).join(':').trim();

      return {
        key,
        operator: op,
        values: val.split(',').map(v => v.trim())
      };
    }

    // Check for symbolic operators
    const symbols = Object.keys(SYMBOL_TO_OP).sort((a, b) => b.length - a.length);

    for (const sym of symbols) {
      const escapedSym = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const symRegex = new RegExp(`^(.+?)\\s*(${escapedSym})\\s*(.*)$`);

      const symMatch = content.match(symRegex);
      if (symMatch) {
        const key = symMatch[1].trim();
        const opSymbol = symMatch[2];
        const val = symMatch[3].trim();

        return {
          key,
          operator: SYMBOL_TO_OP[opSymbol],
          values: val.split(',').map(v => v.trim())
        };
      }
    }
    return null;
}

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
  let match;

  while ((match = bracketRegex.exec(text)) !== null) {
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

/**
 * Extracts plain text from an HTML string.
 * @param content - An HTML string.
 * @returns A single string containing all the text from the document.
 */
export function getTextFromHtml(content: string): string {
  if (!content) return '';

  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = content;

    // Add newlines after block elements for better preview readability
    div
      .querySelectorAll('p, h1, h2, h3, li, blockquote, pre, div')
      .forEach((el) => {
        el.appendChild(document.createTextNode('\n'));
      });

    return div.textContent || '';
  }

  // Node.js fallback (Regex-based)
  // Replace block tags with newlines
  const blockTags = ['p', 'h1', 'h2', 'h3', 'li', 'blockquote', 'pre', 'div'];
  const blockRegex = new RegExp(`</(${blockTags.join('|')})>`, 'gi');
  let text = content.replace(blockRegex, '\n');

  // Remove all other tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode entities (basic ones)
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  return text.trim();
}

/**
 * Prepares HTML for display in code view (pretty printing).
 * Adds newlines before block tags to make it more readable.
 */
export const prettyPrintHtml = (html: string) => {
  if (!html) return '';
  const blockTags = [
    'p',
    'h1',
    'h2',
    'h3',
    'hr',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
  ];
  const regex = new RegExp(`(<(?:${blockTags.join('|')})[^>]*>)`, 'g');
  return html.replace(regex, '\n$1').trim();
};

// === SPACETIME UTILS INTEGRATED HERE ===

export interface GeoCoords {
    lat: number;
    lng: number;
}

export const parseGeo = (value: string): GeoCoords | null => {
    // Expected format: "lat,long" or "lat, long"
    // or maybe GeoJSON-like?
    const parts = value.split(',');
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());

    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
};

export const parseGeoFromValues = (values: string[]): GeoCoords | null => {
    if (!values || values.length === 0) return null;
    return parseGeo(values[0]);
};

export const haversineDistance = (coords1: GeoCoords, coords2: GeoCoords): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const dLon = (coords2.lng - coords1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coords1.lat * (Math.PI/180)) * Math.cos(coords2.lat * (Math.PI/180)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
};
