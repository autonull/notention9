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
export const pmToNoteDocument = (pmDoc: PMDocument, existingProperties: Property[] = [], existingPropertyRefs: PropertyRef[] = []): NoteDocument => {
  const blocks: Block[] = [];
  const propertyRefs: PropertyRef[] = [...existingPropertyRefs];
  const propertyMap = new Map(existingProperties.map(p => [p.key, p]));
  let blockIndex = 0;
  let charOffset = 0;

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
    title: 'Untitled Note',
    tags: [],
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
        
        for (const run of block.content) {
          if (charCount + run.text.length > ref.anchor.offset) {
            const start = ref.anchor.offset - charCount;
            const end = Math.min(start + ref.length, run.text.length);
            foundText = run.text.slice(start, end);
            break;
          }
          charCount += run.text.length;
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
 * Uses simple parsing - can be enhanced with a proper HTML parser
 */
export const htmlToNoteDocument = (html: string, properties: Property[] = []): NoteDocument => {
  // Strip HTML tags and extract text
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .trim();

  // Create a simple paragraph block
  const block: Block = {
    id: generateId(),
    type: 'paragraph',
    content: [{ text }],
  };

  // Create propertyRefs from properties
  const propertyRefs: PropertyRef[] = properties.map((prop, index) => ({
    id: prop.key,
    anchor: { blockIndex: 0, offset: index * 10 }, // rough approximation
    length: prop.values.join(', ').length,
  }));

  return {
    version: 1,
    blocks: [block],
    propertyRefs,
    properties,
    title: 'Untitled Note',
    tags: [],
  };
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