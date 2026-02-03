import { Pattern } from './types.js';

export const DEFAULT_PATTERNS: Pattern[] = [
  {
    id: 'pattern_default_reminder',
    name: 'Reminder Intent',
    description: 'Detects reminder intent and suggests creating a reminder task',
    conditions: [
      { key: 'intent', operator: 'is', values: ['reminder'] }
    ],
    predictedActions: ['Create Reminder Task', 'Set Alarm'],
    confidence: 0.9,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.95
  },
  {
    id: 'pattern_default_schedule',
    name: 'Schedule Intent',
    description: 'Detects scheduling intent and suggests creating a meeting',
    conditions: [
      { key: 'intent', operator: 'is', values: ['schedule'] }
    ],
    predictedActions: ['Schedule Meeting', 'Add to Calendar'],
    confidence: 0.9,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.95
  },
  {
    id: 'pattern_default_communication',
    name: 'Communication Intent',
    description: 'Detects communication intent and suggests sending a message',
    conditions: [
      { key: 'intent', operator: 'is', values: ['communication'] }
    ],
    predictedActions: ['Send Message', 'Draft Email'],
    confidence: 0.85,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.9
  },
  {
    id: 'pattern_default_task',
    name: 'Task Intent',
    description: 'Detects task intent and suggests creating a todo item',
    conditions: [
      { key: 'intent', operator: 'is', values: ['task'] }
    ],
    predictedActions: ['Create Task', 'Add to Todo List', 'Add property [status:is:pending]'],
    confidence: 0.9,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.95
  },
  {
    id: 'pattern_default_budget',
    name: 'Budget Intent',
    description: 'Detects financial intent and suggests adding priority',
    conditions: [
      { key: 'budget', operator: 'is', values: ['ANY'] } // 'ANY' is a placeholder logic handled in matching
    ],
    predictedActions: ['Add property [priority:is:high]'],
    confidence: 0.8,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.9
  },
  {
    id: 'pattern_default_shopping',
    name: 'Shopping Intent',
    description: 'Detects shopping intent and suggests adding to shopping list',
    conditions: [
      { key: 'intent', operator: 'is', values: ['shopping'] }
    ],
    predictedActions: ['Add to Shopping List', 'Order Online', 'Add property [status:is:pending]'],
    confidence: 0.9,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.95
  },
  {
    id: 'pattern_default_health',
    name: 'Health Intent',
    description: 'Detects health-related intent and suggests logging activity',
    conditions: [
      { key: 'intent', operator: 'is', values: ['health'] }
    ],
    predictedActions: ['Log Health Activity', 'Track Workout'],
    confidence: 0.85,
    lastUsed: Date.now(),
    usageCount: 0,
    accuracyRate: 0.9
  }
];
