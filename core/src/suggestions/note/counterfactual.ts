import type { Note, Property, OntologyNode } from '../../types/index.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import type { NoteSuggestion, SuggestionEvidence } from './types.js';
import { shortSha256 } from '../../utils/common.js';

export interface WidenCandidate {
  property: Property;
  originalValue: string;
  widenedValue: string;
  operator: string;
  matchCount: number;
  additionalMatches: number;
}

export interface CounterfactualContext {
  note: Note;
  ontology: OntologyNode[];
  allNotes: Note[];
  currentMatches: Array<{ note: Note; score: number }>;
}

function findNumericWidenings(note: Note, context: CounterfactualContext): WidenCandidate[] {
  const candidates: WidenCandidate[] = [];
  const matchEngine = new MatchEngine(context.ontology);
  
  const offers = context.allNotes.filter(n => {
    const typeProp = n.properties.find(p => p.key === 'type');
    return typeProp?.values.some(v => v.includes('offer')) ?? false;
  });

  for (const prop of note.properties) {
    if (prop.role === 'marker' || prop.role === 'fact') continue;
    if (prop.operator !== 'gte' && prop.operator !== 'lte') continue;

    const attr = findAttributeDef(context.ontology, prop.key);
    if (!attr || attr.type !== 'number') continue;

    const currentValue = parseFloat(prop.values[0]);
    if (isNaN(currentValue)) continue;

    let testValues: number[] = [];
    if (prop.operator === 'gte') {
      // Widening gte means LOWERING the threshold (easier to satisfy)
      testValues = [currentValue * 0.75, currentValue * 0.5, currentValue * 0.25];
    } else {
      // Widening lte means RAISING the threshold (easier to satisfy)
      testValues = [currentValue * 1.5, currentValue * 2, currentValue * 3];
    }

    for (const testValue of testValues) {
      let matchCount = 0;
      for (const offer of offers) {
        const testProp: Property = {
          ...prop,
          values: [String(testValue)]
        };
        const result = matchEngine.calculateMatchScore(
          { ...note, properties: note.properties.map(p => p.key === prop.key ? testProp : p) },
          offer
        );
        if (result.score > 0.3) matchCount++;
      }

      const baseCount = context.currentMatches.length;
      const additionalMatches = matchCount - baseCount;
      
      if (additionalMatches > 0 && matchCount <= 10) {
        candidates.push({
          property: prop,
          originalValue: prop.values[0],
          widenedValue: String(testValue),
          operator: prop.operator,
          matchCount,
          additionalMatches
        });
      }
    }
  }

  return candidates;
}

function findEnumWidenings(note: Note, context: CounterfactualContext): WidenCandidate[] {
  const candidates: WidenCandidate[] = [];
  const matchEngine = new MatchEngine(context.ontology);
  
  const offers = context.allNotes.filter(n => {
    const typeProp = n.properties.find(p => p.key === 'type');
    return typeProp?.values.some(v => v.includes('offer')) ?? false;
  });

  for (const prop of note.properties) {
    if (prop.role === 'marker' || prop.role === 'fact') continue;
    if (prop.operator !== 'is') continue;

    const attr = findAttributeDef(context.ontology, prop.key);
    if (!attr || attr.type !== 'enum' || !attr.options) continue;

    const currentValue = prop.values[0];
    const otherOptions = attr.options.filter(opt => opt !== currentValue);

    for (const otherValue of otherOptions.slice(0, 3)) {
      let matchCount = 0;
      for (const offer of offers) {
        const testProp: Property = {
          ...prop,
          values: [otherValue]
        };
        const result = matchEngine.calculateMatchScore(
          { ...note, properties: note.properties.map(p => p.key === prop.key ? testProp : p) },
          offer
        );
        if (result.score > 0.3) matchCount++;
      }

      const baseCount = context.currentMatches.length;
      const additionalMatches = matchCount - baseCount;
      
      if (additionalMatches > 0 && matchCount <= 10) {
        candidates.push({
          property: prop,
          originalValue: currentValue,
          widenedValue: otherValue,
          operator: 'is',
          matchCount,
          additionalMatches
        });
      }
    }
  }

  return candidates;
}

function findGeoWidenings(note: Note, context: CounterfactualContext): WidenCandidate[] {
  const candidates: WidenCandidate[] = [];
  
  for (const prop of note.properties) {
    if (prop.key !== 'location' && prop.key !== 'address' && prop.key !== 'geo') continue;

    const attr = findAttributeDef(context.ontology, prop.key);
    if (!attr || attr.type !== 'geo') continue;

    candidates.push({
      property: prop,
      originalValue: prop.values[0],
      widenedValue: 'wider-radius',
      operator: 'near',
      matchCount: 0,
      additionalMatches: 0
    });
  }

  return candidates;
}

function findAttributeDef(ontology: OntologyNode[], key: string): { type: string; options?: string[] } | null {
  for (const node of ontology) {
    if (node.attributes?.[key]) return node.attributes[key]!;
    if (node.children) {
      const found = findAttributeDef(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

export function generateCounterfactualSuggestions(
  note: Note,
  currentMatches: Array<{ note: Note; score: number }>,
  context: { ontology: OntologyNode[]; allNotes: Note[] }
): NoteSuggestion[] {
  const counterfactualContext: CounterfactualContext = {
    note,
    ontology: context.ontology,
    allNotes: context.allNotes,
    currentMatches
  };

  const numericCandidates = findNumericWidenings(note, counterfactualContext);
  const enumCandidates = findEnumWidenings(note, counterfactualContext);
  const geoCandidates = findGeoWidenings(note, counterfactualContext);

  const allCandidates = [...numericCandidates, ...enumCandidates, ...geoCandidates]
    .sort((a, b) => b.additionalMatches - a.additionalMatches)
    .slice(0, 3);

  return allCandidates.map(candidate => {
    const evidence: SuggestionEvidence = {
      source: 'fulfillment',
      confidence: Math.min(0.9, 0.5 + candidate.additionalMatches * 0.1),
      details: {
        widenType: candidate.operator === 'gte' || candidate.operator === 'lte' ? 'numeric' :
                   candidate.operator === 'is' ? 'enum' : 'geo',
        originalValue: candidate.originalValue,
        widenedValue: candidate.widenedValue,
        additionalMatches: candidate.additionalMatches,
        totalMatches: candidate.matchCount
      }
    };

    return {
      id: generateSuggestionId(note.id, candidate.property.key, 'counterfactual'),
      noteId: note.id,
      kind: 'inferred-constraint',
      status: 'active',
      title: `Widen ${candidate.property.key}`,
      description: `Changing ${candidate.property.key} from ${candidate.originalValue} to ${candidate.widenedValue} would match ${candidate.additionalMatches} more offer${candidate.additionalMatches === 1 ? '' : 's'} (${candidate.matchCount} total)`,
      evidence: [evidence],
      proposedChange: {
        type: 'modify',
        property: {
          key: candidate.property.key,
          operator: candidate.operator,
          values: [candidate.widenedValue],
          provenance: 'deterministic'
        },
        previousProperty: { ...candidate.property }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generationId: ''
    };
  });
}

function generateSuggestionId(noteId: string, propertyKey: string, suffix: string): string {
  return `sugg-${shortSha256(`${noteId}|${propertyKey}|${suffix}`)}`;
}