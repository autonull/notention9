import type { Note, Property, OntologyNode, OntologyAttribute } from '../../types/index.js';
import type { SuggestionRule, RuleCondition, RuleAction, SuggestionEvidence, NoteSuggestion } from './types.js';
import { shortSha256 } from '../../utils/common.shared.js';

export function evaluateCondition(note: Note, condition: RuleCondition): boolean {
  switch (condition.type) {
    case 'hasProperty': {
      const prop = note.properties.find(p => 
        p.key === condition.key && 
        (!condition.operator || p.operator === condition.operator) &&
        (!condition.value || p.values.includes(condition.value))
      );
      return prop !== undefined;
    }
    case 'hasAnyProperty': {
      return condition.keys.some(key => note.properties.some(p => p.key === key));
    }
    case 'hasAllProperties': {
      return condition.keys.every(key => note.properties.some(p => p.key === key));
    }
    case 'nodeType': {
      return note.properties.some(p => p.key === 'type' && p.values.includes(condition.nodeId));
    }
    case 'and': {
      return condition.conditions.every(c => evaluateCondition(note, c));
    }
    case 'or': {
      return condition.conditions.some(c => evaluateCondition(note, c));
    }
    case 'not': {
      return !evaluateCondition(note, condition.condition);
    }
    case 'propertyMatches': {
      const prop = note.properties.find(p => p.key === condition.key);
      if (!prop) return false;
      const regex = new RegExp(condition.pattern, condition.flags);
      return prop.values.some(v => regex.test(v));
    }
    case 'propertyValueIn': {
      const prop = note.properties.find(p => p.key === condition.key);
      if (!prop) return false;
      return prop.values.some(v => condition.values.includes(v));
    }
    default:
      return false;
  }
}

export function applyRuleAction(
  note: Note,
  rule: SuggestionRule,
  action: RuleAction,
  ontology: OntologyNode[]
): NoteSuggestion | null {
  const evidence: SuggestionEvidence = {
    source: 'rules',
    ruleId: rule.id,
    confidence: 0.9,
    details: { actionType: action.type }
  };

  switch (action.type) {
    case 'suggestAddProperty': {
      const existing = note.properties.find(p => p.key === action.key);
      if (existing) return null;

      const attr = findAttribute(ontology, action.key);
      const operator = attr?.operators?.real?.[0] || action.operator || 'is';

      return {
        id: generateSuggestionId(note.id, rule.id, action),
        noteId: note.id,
        kind: 'add-property',
        status: 'active',
        title: `Add ${action.key}`,
        description: action.reason,
        evidence: [evidence],
        proposedChange: {
          type: 'add',
          property: {
            key: action.key,
            operator,
            values: [action.value],
            provenance: 'deterministic'
          }
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        generationId: ''
      };
    }
    case 'suggestModifyProperty': {
      const existing = note.properties.find(p => p.key === action.key);
      if (!existing) return null;

      return {
        id: generateSuggestionId(note.id, rule.id, action),
        noteId: note.id,
        kind: 'modify-property',
        status: 'active',
        title: `Modify ${action.key}`,
        description: action.reason,
        evidence: [evidence],
        proposedChange: {
          type: 'modify',
          property: {
            key: action.key,
            operator: action.operator || existing.operator,
            values: [action.value],
            provenance: 'deterministic'
          },
          previousProperty: { ...existing }
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        generationId: ''
      };
    }
    case 'suggestRemoveProperty': {
      const existing = note.properties.find(p => p.key === action.key);
      if (!existing) return null;

      return {
        id: generateSuggestionId(note.id, rule.id, action),
        noteId: note.id,
        kind: 'remove-property',
        status: 'active',
        title: `Remove ${action.key}`,
        description: action.reason,
        evidence: [evidence],
        proposedChange: {
          type: 'remove',
          previousProperty: { ...existing }
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        generationId: ''
      };
    }
    case 'suggestFulfillment': {
      return {
        id: generateSuggestionId(note.id, rule.id, action),
        noteId: note.id,
        kind: 'fulfillment-hint',
        status: 'active',
        title: 'Fulfillment available',
        description: action.reason,
        evidence: [evidence],
        skillId: action.skillId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        generationId: ''
      };
    }
    case 'suggestRelated': {
      return {
        id: generateSuggestionId(note.id, rule.id, action),
        noteId: note.id,
        kind: 'related-note',
        status: 'active',
        title: 'Related note found',
        description: action.reason,
        evidence: [evidence],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        generationId: ''
      };
    }
  }
}

function findAttribute(ontology: OntologyNode[], key: string): OntologyAttribute | null {
  for (const node of ontology) {
    if (node.attributes?.[key]) return node.attributes[key]!;
    if (node.children) {
      const found = findAttribute(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

function generateSuggestionId(noteId: string, ruleId: string, action: RuleAction): string {
  const content = `${noteId}|${ruleId}|${JSON.stringify(action)}`;
  return `sugg-${shortSha256(content)}`;
}

export function getDefaultRules(): SuggestionRule[] {
  return [
    {
      id: 'rule-add-location-for-meetup',
      name: 'Add location for meetup',
      description: 'Suggest adding location when note is a meetup request',
      targetNodeIds: ['social/meetup-request'],
      condition: { type: 'nodeType', nodeId: 'social/meetup-request' },
      action: {
        type: 'suggestAddProperty',
        key: 'location',
        operator: 'is',
        value: '',
        reason: 'Meetup requests should include a location'
      },
      priority: 10,
      enabled: true
    },
    {
      id: 'rule-add-budget-for-job',
      name: 'Add budget for job request',
      description: 'Suggest adding budget when note is a job request',
      targetNodeIds: ['work/job-request'],
      condition: { type: 'nodeType', nodeId: 'work/job-request' },
      action: {
        type: 'suggestAddProperty',
        key: 'budget',
        operator: 'gte',
        value: '0',
        reason: 'Job requests should indicate a budget range'
      },
      priority: 10,
      enabled: true
    },
    {
      id: 'rule-add-schedule-for-recurring',
      name: 'Add schedule for recurring requests',
      description: 'Suggest adding schedule when frequency is specified',
      targetNodeIds: ['request/need-request'],
      condition: { type: 'hasProperty', key: 'frequency' },
      action: {
        type: 'suggestAddProperty',
        key: 'schedule',
        operator: 'is',
        value: '',
        reason: 'Recurring requests should specify a schedule'
      },
      priority: 8,
      enabled: true
    },
    {
      id: 'rule-suggest-fulfillment-for-skills',
      name: 'Suggest fulfillment for skill-matched notes',
      description: 'When a note matches a skill pattern, suggest fulfillment',
      targetNodeIds: ['request/need-request', 'work/job-request', 'social/meetup-request'],
      condition: { type: 'hasAnyProperty', keys: ['skill', 'role', 'service', 'task'] },
      action: {
        type: 'suggestFulfillment',
        skillId: 'auto',
        reason: 'This request matches available fulfillment skills'
      },
      priority: 15,
      enabled: true
    },
    {
      id: 'rule-add-deadline-for-urgent',
      name: 'Add deadline for urgent requests',
      description: 'Suggest adding deadline when priority is high',
      targetNodeIds: ['request/need-request'],
      condition: { type: 'propertyValueIn', key: 'priority', values: ['high', 'urgent', 'critical'] },
      action: {
        type: 'suggestAddProperty',
        key: 'deadline',
        operator: 'is',
        value: '',
        reason: 'Urgent requests should have a deadline'
      },
      priority: 12,
      enabled: true
    },
    {
      id: 'rule-add-contact-for-offers',
      name: 'Add contact for offer notes',
      description: 'Offers should include contact information',
      targetNodeIds: ['offer/skill-offer', 'offer/service-offer'],
      condition: { type: 'nodeType', nodeId: 'offer/skill-offer' },
      action: {
        type: 'suggestAddProperty',
        key: 'contact',
        operator: 'is',
        value: '',
        reason: 'Offers should include contact information'
      },
      priority: 10,
      enabled: true
    }
  ];
}