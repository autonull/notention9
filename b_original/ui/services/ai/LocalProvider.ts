import type { AIProvider, InferredAttribute } from '@notention/core';
import type { Note, OntologyNode } from '@notention/core';
import { parseProperties, getTextFromHtml } from '@notention/core';
import { addDays, format } from 'date-fns';
import { parseQuantity } from '@notention/core';

export class LocalAIProvider implements AIProvider {
  name = 'Local (Heuristic)';
  isAvailable = true;

  async generateCompletion(prompt: string): Promise<string> {
    if (prompt.includes("Suggest 5 semantic tags")) {
        return "I can only suggest tags if you ask me about specific text.";
    }
    return 'Local AI provider does not support generic text generation yet.';
  }

  async suggestTags(text: string): Promise<string[]> {
    const tags = new Set<string>();

    const matches = text.match(/#[\w-]+/g);
    if (matches) {
        matches.forEach(t => tags.add(t.slice(1)));
    }

    const lower = text.toLowerCase();

    if (lower.includes('todo') || lower.includes('task') || lower.includes('do:')) {
        tags.add('task');
    }
    if (lower.includes('meeting') || lower.includes('call with') || lower.includes('sync')) {
        tags.add('meeting');
    }
    if (lower.includes('idea') || lower.includes('concept') || lower.includes('maybe')) {
        tags.add('idea');
    }
    if (lower.includes('bug') || lower.includes('fix') || lower.includes('error')) {
        tags.add('bug');
    }
    if (lower.includes('http') || lower.includes('www')) {
        tags.add('link');
    }

    if (lower.includes('project')) {
        tags.add('project');
        if (lower.includes('done') || lower.includes('wip') || lower.includes('blocked')) {
            tags.add('[status:is:Active]');
        }
        if (lower.includes('due') || lower.includes('deadline')) {
            tags.add('[deadline:is:?]');
        }
    }

    return Array.from(tags);
  }

  async analyzeOntology(notes: Note[], context?: string): Promise<InferredAttribute[]> {
    const propertyMap = new Map<string, { count: number; values: Set<string> }>();

    for (const note of notes) {
      const props = note.properties.length > 0
        ? note.properties
        : parseProperties(getTextFromHtml(note.content));

      for (const prop of props) {
        if (!propertyMap.has(prop.key)) {
          propertyMap.set(prop.key, { count: 0, values: new Set() });
        }
        const entry = propertyMap.get(prop.key)!;
        entry.count++;
        prop.values.forEach(v => entry.values.add(v));
      }
    }

    if (context === 'Project') {
       if (!propertyMap.has('budget')) propertyMap.set('budget', { count: 1, values: new Set(['1000']) });
       if (!propertyMap.has('deadline')) propertyMap.set('deadline', { count: 1, values: new Set(['2024-01-01']) });
    }

    const attributes: InferredAttribute[] = [];

    for (const [key, stats] of propertyMap.entries()) {
      if (stats.count < 1) continue;

      const values = Array.from(stats.values);
      const type = this.inferType(values);

      attributes.push({
        key,
        type,
        usageCount: stats.count,
        sampleValues: values.slice(0, 5),
        description: `Automatically inferred from ${stats.count} notes.`
      });
    }

    return attributes;
  }

  private inferType(values: string[]): InferredAttribute['type'] {
    if (values.length === 0) return 'string';

    const allNumbers = values.every(v => !isNaN(parseFloat(v)) && isFinite(Number(v)));
    if (allNumbers) return 'number';

    const allDates = values.every(v => !isNaN(Date.parse(v)));
    if (allDates) return 'date';

    if (values.length < 5) return 'enum';

    return 'string';
  }

  async alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]> {
      const properties = new Set<string>();
      const lowerText = text.toLowerCase();

      // --- Price / Cost (Refined) ---
      // "under 500", "below 500"
      const lessThanMatch = text.match(/(?:under|below|less than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
      if (lessThanMatch) {
          const symbol = lessThanMatch[1] || '';
          const amount = lessThanMatch[2];
          const suffix = lessThanMatch[3] || '';
          const raw = `${symbol}${amount} ${suffix}`.trim();
          const q = parseQuantity(raw);
          const val = q ? `${q.value} ${q.unit}` : amount;
          properties.add(`[price:less than:${val.trim()}]`);
      }

      // "over 500", "above 500"
      const greaterThanMatch = text.match(/(?:over|above|more than)\s*([$€£])?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*(usd|eur|gbp|sats))?/i);
      if (greaterThanMatch) {
          const symbol = greaterThanMatch[1] || '';
          const amount = greaterThanMatch[2];
          const suffix = greaterThanMatch[3] || '';
          const raw = `${symbol}${amount} ${suffix}`.trim();
          const q = parseQuantity(raw);
          const val = q ? `${q.value} ${q.unit}` : amount;
          properties.add(`[price:greater than:${val.trim()}]`);
      }

      // Exact price: "$500", "500 USD"
      if (!lessThanMatch && !greaterThanMatch) {
          const priceMatch = text.match(/([$€£])\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
          if (priceMatch) {
              const q = parseQuantity(`${priceMatch[1]}${priceMatch[2]}`);
              const val = q ? `${q.value} ${q.unit}` : priceMatch[2];
              properties.add(`[price:is:${val}]`);
          } else {
              const currencyMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(USD|EUR|GBP|sats)/i);
              if (currencyMatch) {
                  const q = parseQuantity(`${currencyMatch[1]} ${currencyMatch[2]}`);
                  const val = q ? `${q.value} ${q.unit}` : currencyMatch[1];
                  properties.add(`[price:is:${val}]`);
              }
          }
      }

      // --- Intent & Role ---
      // "looking for X" -> [role contains X]
      const roleReqMatch = text.match(/(?:looking for|hiring|need) (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:for|in|to|with)|$))/i);
      if (roleReqMatch) {
          const role = roleReqMatch[1].trim();
          if (role.split(' ').length < 5) {
              properties.add(`[role:contains:${role}]`);
          }
      }

      // "I am a X" -> [role is X]
      const roleOfferMatch = text.match(/i am (?:a|an)\s+([a-zA-Z\s]+?)(?=(?:[\.,]|\s+(?:who|with|looking)|$))/i);
      if (roleOfferMatch) {
          const role = roleOfferMatch[1].trim();
          if (role.split(' ').length < 5) {
              properties.add(`[role:is:${role}]`);
          }
      }

      // --- Range ---
      const rangeMatch = text.match(/(?:between|from)?\s*(\$|€|£)?\s*(\d+)\s*(?:and|to|-)\s*(\$|€|£)?\s*(\d+)\s*(?:usd|eur|gbp)?/i);
      if (rangeMatch) {
          const min = rangeMatch[2];
          const max = rangeMatch[4];
          if (min && max && Number(max) > Number(min)) {
              properties.add(`[price:between:${min},${max}]`);
          }
      }

      // --- Dates (Enhanced) ---
      const today = new Date();
      if (lowerText.includes('due tomorrow') || lowerText.includes('deadline tomorrow')) {
          const d = addDays(today, 1);
          properties.add(`[deadline:is:${format(d, 'yyyy-MM-dd')}]`);
      }
      if (lowerText.includes('due today') || lowerText.includes('deadline today')) {
          properties.add(`[deadline:is:${format(today, 'yyyy-MM-dd')}]`);
      }
      if (lowerText.includes('next week')) {
           const d = addDays(today, 7);
           properties.add(`[deadline:is:${format(d, 'yyyy-MM-dd')}]`);
      }

      const inDaysMatch = lowerText.match(/(?:in|within) (\d+) days/);
      if (inDaysMatch) {
          const d = addDays(today, parseInt(inDaysMatch[1]));
          properties.add(`[deadline:is:${format(d, 'yyyy-MM-dd')}]`);
      }

      // --- Email ---
      const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
          properties.add(`[email:is:${emailMatch[0]}]`);
      }

      // --- Ontology-based Extraction (Enhanced) ---
      const allKeys: string[] = [];
      const traverse = (nodes: OntologyNode[]) => {
          nodes.forEach(n => {
              if (n.attributes) {
                  Object.keys(n.attributes).forEach(k => allKeys.push(k));
              }
              if (n.children) traverse(n.children);
          });
      };
      traverse(ontology);
      allKeys.sort((a, b) => b.length - a.length);
      const uniqueKeys = new Set(allKeys);

      uniqueKeys.forEach(key => {
          // Look for: Key: Value, Key is Value, Key under Value, Key over Value
          // We use a broader regex to capture operators
          const regex = new RegExp(`${key}\\s*(is|:|contains|under|below|over|above|less than|more than|greater than)\\s*([\\w\\s@.:/\\-]+)`, 'i');
          const match = text.match(regex);

          if (match) {
              const operatorStr = match[1].toLowerCase();
              let val = match[2].trim();
              val = val.replace(/[.,!?;:]$/, '');

              if (val && val.length < 50) {
                  let op = 'is';
                  if (operatorStr.includes('contains')) op = 'contains';
                  else if (['under', 'below', 'less than'].some(s => operatorStr.includes(s))) op = 'less than';
                  else if (['over', 'above', 'more than', 'greater than'].some(s => operatorStr.includes(s))) op = 'greater than';

                  // Try to normalize quantity
                  const q = parseQuantity(val);
                  if (q && q.unit) {
                      val = `${q.value} ${q.unit}`;
                  }

                  properties.add(`[${key}:${op}:${val}]`);
              }
          }
      });

      return Array.from(properties);
  }

  async optimizeOntology(_ontology: OntologyNode[]): Promise<{ merged: { source: string, target: string }[], pruned: string[] }> {
      return { merged: [], pruned: [] };
  }
}
