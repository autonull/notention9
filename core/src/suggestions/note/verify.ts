import type { Note, Property, OntologyNode } from '../../types/index.js';
import type { NoteSuggestion, VerificationResult, SkillDefinition } from './types.js';
import { OntologyService } from '../../ontology/ontologyService.js';
import { MatchEngine } from '../../matching/MatchEngine.js';

export interface VerificationContext {
  note: Note;
  ontology: OntologyNode[];
  allNotes: Note[];
  skills?: SkillDefinition[];
}

export function verifySuggestion(
  suggestion: NoteSuggestion,
  context: VerificationContext
): VerificationResult {
  const { note, ontology, allNotes } = context;
  const ontologyService = new OntologyService(ontology);
  const matchEngine = new MatchEngine(ontology);

  const reasons: string[] = [];
  let confidence = suggestion.evidence[0]?.confidence || 0.5;
  let valid = true;

  if (suggestion.proposedChange) {
    const propCheck = verifyPropertyChange(suggestion.proposedChange, note, ontologyService);
    valid = valid && propCheck.valid;
    confidence = Math.min(confidence, propCheck.confidence);
    reasons.push(...propCheck.reasons);
  }

  // Duplicate check only applies to 'add' type changes
  if (suggestion.proposedChange?.type === 'add') {
    const duplicateCheck = checkDuplicate(suggestion, note);
    if (!duplicateCheck.valid) {
      valid = false;
      reasons.push(...duplicateCheck.reasons);
    }
  }

  if (suggestion.kind === 'related-note' && suggestion.relatedNoteId) {
    const relatedNote = allNotes.find(n => n.id === suggestion.relatedNoteId);
    if (relatedNote) {
      const matchCheck = verifyRelatedMatch(note, relatedNote, matchEngine);
      valid = valid && matchCheck.valid;
      confidence = Math.min(confidence, matchCheck.confidence);
      reasons.push(...matchCheck.reasons);
    } else {
      valid = false;
      reasons.push('Related note not found');
    }
  }

  if (suggestion.kind === 'fulfillment-hint' && suggestion.skillId) {
    const skillCheck = verifySkillMatch(suggestion.skillId, note, context.skills);
    valid = valid && skillCheck.valid;
    confidence = Math.min(confidence, skillCheck.confidence);
    reasons.push(...skillCheck.reasons);
  }

  return {
    valid,
    confidence: Math.max(0, Math.min(1, confidence)),
    reasons: reasons.length > 0 ? reasons : ['Verification passed']
  };
}

function verifyPropertyChange(
  change: { type: string; property?: Property; previousProperty?: Property },
  note: Note,
  ontologyService: OntologyService
): VerificationResult {
  const reasons: string[] = [];
  let confidence = 0.8;
  let valid = true;

  if (change.type === 'add' && change.property) {
    const { key, operator, values } = change.property;

    const attr = ontologyService.getAttribute(key);
    if (!attr) {
      reasons.push(`Property '${key}' not defined in ontology`);
      confidence *= 0.5;
    } else {
      const validOps = ontologyService.getValidOperators(key);
      if (!validOps.includes(operator)) {
        reasons.push(`Operator '${operator}' not valid for '${key}'`);
        valid = false;
      }

      if (attr.type === 'enum' && attr.options) {
        const invalidValues = values.filter(v => !attr.options!.includes(v));
        if (invalidValues.length > 0) {
          reasons.push(`Values not in enum: ${invalidValues.join(', ')}`);
          valid = false;
        }
      }

      const existing = note.properties.find(p => p.key === key);
      if (existing) {
        reasons.push(`Property '${key}' already exists`);
        valid = false;
      }
    }
  }

  if (change.type === 'modify' && change.property && change.previousProperty) {
    const { key, operator, values } = change.property;

    const attr = ontologyService.getAttribute(key);
    if (!attr) {
      reasons.push(`Property '${key}' not defined in ontology`);
      confidence *= 0.5;
    } else {
      const validOps = ontologyService.getValidOperators(key);
      if (!validOps.includes(operator)) {
        reasons.push(`Operator '${operator}' not valid for '${key}'`);
        valid = false;
      }
    }

    const existing = note.properties.find(p => p.key === key);
    if (!existing) {
      reasons.push(`Property '${key}' not found for modification`);
      valid = false;
    }
  }

  if (change.type === 'remove' && change.previousProperty) {
    const { key } = change.previousProperty;
    const existing = note.properties.find(p => p.key === key);
    if (!existing) {
      reasons.push(`Property '${key}' not found for removal`);
      valid = false;
    }
  }

  return { valid, confidence, reasons };
}

function verifyRelatedMatch(
  requestNote: Note,
  offerNote: Note,
  matchEngine: MatchEngine
): VerificationResult {
  const result = matchEngine.calculateMatchScore(requestNote, offerNote);
  const reasons: string[] = [];

  let valid = result.score > 0.3;
  let confidence = result.score;

  if (!valid) {
    reasons.push(`Match score too low: ${result.score.toFixed(2)}`);
  }

  if (result.missing.length > 0) {
    reasons.push(`Missing required properties: ${result.missing.map(m => m.key).join(', ')}`);
    confidence *= 0.7;
  }

  if (result.conflicts.length > 0) {
    reasons.push(`Conflicts found: ${result.conflicts.map(c => c.requestProp.key).join(', ')}`);
    confidence *= 0.5;
  }

  return { valid, confidence, reasons };
}

function verifySkillMatch(skillId: string, note: Note, skills: SkillDefinition[] = []): VerificationResult {
  const reasons: string[] = [];
  let confidence = 0.7;
  let valid = true;

  const skill = skills.find(s => s.id === skillId);
  if (!skill) {
    reasons.push(`Skill '${skillId}' not found in available skills`);
    valid = false;
    confidence = 0;
  }

  return { valid, confidence, reasons };
}

function checkDuplicate(suggestion: NoteSuggestion, note: Note): VerificationResult {
  const reasons: string[] = [];
  let valid = true;

  if (suggestion.proposedChange?.property?.key) {
    const key = suggestion.proposedChange.property.key;
    const existing = note.properties.find(p => p.key === key);
    if (existing) {
      reasons.push(`Property '${key}' already exists on note`);
      valid = false;
    }
  }

  return { valid, confidence: valid ? 1.0 : 0.0, reasons };
}

export function verifyAllSuggestions(
  suggestions: NoteSuggestion[],
  context: VerificationContext
): Map<string, VerificationResult> {
  const results = new Map<string, VerificationResult>();

  for (const suggestion of suggestions) {
    results.set(suggestion.id, verifySuggestion(suggestion, context));
  }

  return results;
}

export function filterValidSuggestions(
  suggestions: NoteSuggestion[],
  context: VerificationContext,
  minConfidence = 0.5
): NoteSuggestion[] {
  const results = verifyAllSuggestions(suggestions, context);
  
  return suggestions.filter(s => {
    const result = results.get(s.id);
    return result?.valid && (result?.confidence || 0) >= minConfidence;
  });
}