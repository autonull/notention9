import type { NoteDocument, Block, TextRun, Mark, PropertyRef, MarkType } from '../types/noteDocument.js';
import type { Property } from '../types/domain.js';
import { generateId } from '../utils/common.js';
import { createNoteDocument } from '../types/noteDocument.js';

/**
 * ProseMirror JSON node types
 */
export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: PMMark[];
  text?: string;
}

export interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface PMDocument {
  type: 'doc';
  content: PMNode[];
}

/**
 * Convert NoteDocument to ProseMirror JSON
 */
export const noteDocumentToPM = (doc: NoteDocument): PMDocument => {
  const nodes: PMNode[] = doc.blocks.map(block => blockToPM(block, doc.propertyRefs));
  return { type: 'doc', content: nodes };
};

/**
 * Convert a Block to ProseMirror node
 */
const blockToPM = (block: Block, propertyRefs: PropertyRef[]): PMNode => {
  const baseNode: PMNode = {
    type: block.type === 'heading' ? 'heading' : block.type,
    attrs: {},
    content: [],
  };

  if (block.type === 'heading' && block.level) {
    baseNode.attrs = { level: block.level };
  } else if (block.type === 'list') {
    baseNode.attrs = { listType: block.listType || 'bullet' };
  }

  let currentMarks: PMMark[] = [];
  let textBuffer = '';

  for (const run of block.content) {
    if (run.text) {
      textBuffer += run.text;
    }
    if (run.marks && run.marks.length > 0) {
      currentMarks = run.marks.map(markToPM);
    }
  }

  // Build text nodes with marks
  let offset = 0;
  const textNodes: PMNode[] = [];
  for (const run of block.content) {
    if (!run.text) continue;
    const marks = run.marks ? run.marks.map(markToPM) : [];
    if (marks.length > 0) {
      textNodes.push({ type: 'text', text: run.text, marks });
    } else {
      textNodes.push({ type: 'text', text: run.text });
    }
    offset += run.text.length;
  }

  baseNode.content = textNodes.length > 0 ? textNodes : [{ type: 'text', text: '' }];
  return baseNode;
};

/**
 * Convert a Mark to ProseMirror mark
 */
const markToPM = (mark: Mark): PMMark => {
  const attrs = mark.attrs || {};
  if (mark.type === 'propertyRef' && mark.propertyId) {
    return { type: 'propertyRef', attrs: { propertyId: mark.propertyId, ...attrs } };
  }
  return { type: mark.type, attrs };
};

/**
 * Convert ProseMirror JSON to NoteDocument
 */
export const pmToNoteDocument = (
  pmDoc: PMDocument,
  existingProperties: Property[] = [],
  existingPropertyRefs: PropertyRef[] = [],
  options: { title?: string; tags?: string[] } = {}
): NoteDocument => {
  const blocks: Block[] = [];
  const propertyRefs: PropertyRef[] = [...existingPropertyRefs];
  const propertyMap = new Map(existingProperties.map(p => [p.key, p]));
  let blockIndex = 0;

  for (const node of pmDoc.content || []) {
    const block = pmNodeToBlock(node, blockIndex, propertyRefs, propertyMap);
    blocks.push(block);
    blockIndex++;
  }

  // Rebuild properties from propertyRefs
  const properties = rebuildProperties(propertyRefs, blocks);

  return {
    version: 1,
    blocks,
    propertyRefs,
    properties,
    title: options.title || 'Untitled Note',
    tags: options.tags || [],
  };
};

/**
 * Convert a ProseMirror node to Block
 */
const pmNodeToBlock = (
  node: PMNode,
  blockIndex: number,
  propertyRefs: PropertyRef[],
  propertyMap: Map<string, Property>
): Block => {
  const block: Block = {
    id: node.attrs?.id as string || generateId(),
    type: node.type as Block['type'],
    content: [],
  };

  if (node.type === 'heading' && node.attrs?.level) {
    block.level = node.attrs.level as number;
  } else if (node.type === 'list') {
    block.listType = (node.attrs?.listType as 'bullet' | 'ordered') || 'bullet';
  }

  let charOffset = 0;

  for (const child of node.content || []) {
    if (child.type === 'text') {
      const marks = child.marks || [];
      const runMarks = marks.map(pmMarkToMark);
      
      // Check for propertyRef marks
      for (const mark of marks) {
        if (mark.type === 'propertyRef' && mark.attrs?.propertyId) {
          const propertyId = mark.attrs.propertyId as string;
          const existingRef = propertyRefs.find(r => r.id === propertyId);
          if (!existingRef) {
            propertyRefs.push({
              id: propertyId,
              anchor: { blockIndex, offset: charOffset },
              length: child.text?.length || 0,
            });
          }
        }
      }

      block.content.push({
        text: child.text || '',
        marks: runMarks.length > 0 ? runMarks : undefined,
      });
      charOffset += child.text?.length || 0;
    }
  }

  if (block.content.length === 0) {
    block.content.push({ text: '' });
  }

  return block;
};

/**
 * Convert ProseMirror mark to Mark
 */
const pmMarkToMark = (pmMark: PMMark): Mark => {
  if (pmMark.type === 'propertyRef') {
    return {
      type: 'propertyRef',
      propertyId: pmMark.attrs?.propertyId as string,
      attrs: pmMark.attrs,
    };
  }
  return { type: pmMark.type as MarkType, attrs: pmMark.attrs };
};

/**
 * Rebuild properties array from propertyRefs and blocks
 */
const rebuildProperties = (propertyRefs: PropertyRef[], blocks: Block[]): Property[] => {
  const propertyMap = new Map<string, Property>();
  
  for (const ref of propertyRefs) {
    if (!propertyMap.has(ref.id)) {
      // Extract the text at the anchor position
      const block = blocks[ref.anchor.blockIndex];
      if (block) {
        let charCount = 0;
        let foundText = '';
        let remainingLength = ref.length;
        
        for (const run of block.content) {
          const runLength = run.text.length;
          if (charCount + runLength > ref.anchor.offset) {
            const start = ref.anchor.offset - charCount;
            const end = Math.min(start + remainingLength, runLength);
            foundText += run.text.slice(start, end);
            remainingLength -= (end - start);
            if (remainingLength <= 0) break;
          }
          charCount += runLength;
        }
        
        propertyMap.set(ref.id, {
          key: ref.id,
          operator: 'is',
          values: [foundText || ''],
          provenance: 'user',
        });
      }
    }
  }
  
  return Array.from(propertyMap.values());
};

/**
 * Import HTML content to NoteDocument
 * Parses HTML structure into blocks (headings, paragraphs, lists, quotes, code)
 */
export const htmlToNoteDocument = (html: string, properties: Property[] = [], options: { title?: string; tags?: string[] } = {}): NoteDocument => {
  if (!html || !html.trim()) {
    return createNoteDocument({ title: options.title || 'Untitled Note', tags: options.tags || [] });
  }

  // Parse HTML into structured blocks
  const blocks = parseHtmlToBlocks(html);
  
  // Create propertyRefs from properties
  const propertyRefs: PropertyRef[] = properties.map((prop, index) => ({
    id: prop.key,
    anchor: { blockIndex: 0, offset: index * 10 },
    length: prop.values.join(', ').length,
  }));

  return {
    version: 1,
    blocks: blocks.length > 0 ? blocks : [{ id: generateId(), type: 'paragraph', content: [{ text: '' }] }],
    propertyRefs,
    properties,
    title: options.title || 'Untitled Note',
    tags: options.tags || [],
  };
};

/**
 * Parse HTML string into NoteDocument blocks
 * Works in both browser (DOMParser) and Node (regex fallback)
 */
const parseHtmlToBlocks = (html: string): Block[] => {
  const blocks: Block[] = [];

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    // Browser: use DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    parseDOMToBlocks(doc.body, blocks);
  } else {
    // Node: use regex-based parsing
    parseHtmlRegexToBlocks(html, blocks);
  }

  return blocks;
};

/**
 * Parse DOM nodes to blocks (browser)
 */
const parseDOMToBlocks = (node: Node, blocks: Block[], listParentType?: 'ul' | 'ol'): void => {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        // Add as paragraph if no current block or last block is not a paragraph
        if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'paragraph') {
          blocks.push({ id: generateId(), type: 'paragraph', content: [{ text }] });
        } else {
          blocks[blocks.length - 1].content.push({ text });
        }
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      const tagName = element.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          blocks.push({
            id: generateId(),
            type: 'heading',
            level: parseInt(tagName[1]),
            content: [{ text: element.textContent?.trim() || '' }],
          });
          break;
        case 'p':
          blocks.push({
            id: generateId(),
            type: 'paragraph',
            content: [{ text: element.textContent?.trim() || '' }],
          });
          break;
        case 'ul':
        case 'ol':
          const listItems: Block['content'] = [];
          for (const li of Array.from(element.children)) {
            if (li.tagName.toLowerCase() === 'li') {
              listItems.push({ text: li.textContent?.trim() || '' });
            }
          }
          if (listItems.length > 0) {
            blocks.push({
              id: generateId(),
              type: 'list',
              listType: tagName === 'ol' ? 'ordered' : 'bullet',
              content: listItems,
            });
          }
          break;
        case 'blockquote':
          blocks.push({
            id: generateId(),
            type: 'quote',
            content: [{ text: element.textContent?.trim() || '' }],
          });
          break;
        case 'pre':
          const code = element.querySelector('code');
          blocks.push({
            id: generateId(),
            type: 'code',
            content: [{ text: code?.textContent || element.textContent?.trim() || '' }],
          });
          break;
        case 'br':
          // Force new paragraph
          if (blocks.length > 0 && blocks[blocks.length - 1].type === 'paragraph') {
            blocks[blocks.length - 1].content.push({ text: '\n' });
          } else {
            blocks.push({ id: generateId(), type: 'paragraph', content: [{ text: '' }] });
          }
          break;
        default:
          // Recursively parse other elements
          parseDOMToBlocks(element, blocks, listParentType);
      }
    }
  }
};

/**
 * Parse HTML with regex (Node.js fallback)
 */
const parseHtmlRegexToBlocks = (html: string, blocks: Block[]): void => {
  // Simple regex-based block parsing
  const blockPatterns = [
    { regex: /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gis, type: 'heading' as const, levelExtractor: (match: RegExpMatchArray) => parseInt(match[1]) },
    { regex: /<p[^>]*>(.*?)<\/p>/gis, type: 'paragraph' as const },
    { regex: /<ul[^>]*>(.*?)<\/ul>/gis, type: 'list' as const, listType: 'bullet' as const },
    { regex: /<ol[^>]*>(.*?)<\/ol>/gis, type: 'list' as const, listType: 'ordered' as const },
    { regex: /<blockquote[^>]*>(.*?)<\/blockquote>/gis, type: 'quote' as const },
    { regex: /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, type: 'code' as const },
  ];

  let remainingHtml = html;
  let lastIndex = 0;

  // Sort matches by position to maintain order
  const allMatches: Array<{ index: number; match: RegExpMatchArray; pattern: typeof blockPatterns[0] }> = [];

  for (const pattern of blockPatterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(html)) !== null) {
      allMatches.push({ index: match.index, match, pattern });
    }
  }

  allMatches.sort((a, b) => a.index - b.index);

  for (const { match, pattern } of allMatches) {
    const content = match[pattern.type === 'heading' ? 2 : 1] || '';
    const cleanContent = content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .trim();

    if (!cleanContent && pattern.type !== 'list') continue;

    if (pattern.type === 'list') {
      // Parse list items into a single list block
      const listHtml = match[1] || '';
      const liMatches = listHtml.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
      const listItems: Block['content'] = [];
      for (const liMatch of liMatches) {
        const liContent = liMatch
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .trim();
        if (liContent) {
          listItems.push({ text: liContent });
        }
      }
      if (listItems.length > 0) {
        blocks.push({
          id: generateId(),
          type: 'list',
          listType: pattern.listType,
          content: listItems,
        });
      }
    } else {
      const block: Block = {
        id: generateId(),
        type: pattern.type,
        content: [{ text: cleanContent }],
      };
      if (pattern.type === 'heading' && 'levelExtractor' in pattern) {
        block.level = pattern.levelExtractor(match);
      }
      blocks.push(block);
    }
  }

  // If no blocks found, treat as single paragraph
  if (blocks.length === 0) {
    const text = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .trim();
    if (text) {
      blocks.push({ id: generateId(), type: 'paragraph', content: [{ text }] });
    }
  }
};

/**
 * Export NoteDocument to HTML (for Nostr, clipboard, preview)
 */
export const noteDocumentToHtml = (doc: NoteDocument): string => {
  let html = '';
  
  for (const block of doc.blocks) {
    switch (block.type) {
      case 'heading':
        html += `<h${block.level || 1}>`;
        html += block.content.map(run => renderTextRun(run, doc.propertyRefs)).join('');
        html += `</h${block.level || 1}>\n`;
        break;
      case 'list':
        html += block.listType === 'ordered' ? '<ol>' : '<ul>';
        for (const run of block.content) {
          html += '<li>';
          html += renderTextRun(run, doc.propertyRefs);
          html += '</li>';
        }
        html += block.listType === 'ordered' ? '</ol>\n' : '</ul>\n';
        break;
      case 'quote':
        html += '<blockquote>';
        html += block.content.map(run => renderTextRun(run, doc.propertyRefs)).join('');
        html += '</blockquote>\n';
        break;
      case 'code':
        html += '<pre><code>';
        html += block.content.map(run => renderTextRun(run, doc.propertyRefs)).join('');
        html += '</code></pre>\n';
        break;
      default: // paragraph
        html += '<p>';
        html += block.content.map(run => renderTextRun(run, doc.propertyRefs)).join('');
        html += '</p>\n';
    }
  }
  
  return html.trim();
};

/**
 * Render a text run with marks to HTML
 */
const renderTextRun = (run: TextRun, propertyRefs: PropertyRef[]): string => {
  let text = run.text;
  
  if (!run.marks || run.marks.length === 0) {
    return escapeHtml(text);
  }
  
  // Build HTML from marks
  let result = escapeHtml(text);
  for (const mark of run.marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'strike':
        result = `<del>${result}</del>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        if (mark.attrs?.href) {
          result = `<a href="${escapeHtml(mark.attrs.href as string)}">${result}</a>`;
        }
        break;
      case 'propertyRef':
        // Render as span with data attributes for compatibility
        if (mark.propertyId) {
          const propRef = propertyRefs.find(r => r.id === mark.propertyId);
          if (propRef) {
            result = `<span data-type="property" data-name="${escapeHtml(propRef.id)}" data-operator="is" data-value="${escapeHtml(text)}"></span>`;
          }
        }
        break;
    }
  }
  
  return result;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
};