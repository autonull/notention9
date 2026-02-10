import { UIMetaphor } from '../types/metaphor.js';

export const DEFAULT_METAPHORS: UIMetaphor[] = [
  {
    id: 'conditional-automation',
    name: 'Conditional Automation',
    description: 'Automate actions based on conditions',
    icon: '⚡',
    color: '#3b82f6',
    category: 'automation',
    template: '[if:condition] [then:action]',
    properties: [
      {
        name: 'condition',
        type: 'string',
        label: 'Condition',
        description: 'What condition triggers the action',
        required: true
      },
      {
        name: 'action',
        type: 'string',
        label: 'Action',
        description: 'What action to take when condition is met',
        required: true
      },
      {
        name: 'frequency',
        type: 'enum',
        label: 'Frequency',
        description: 'How often to check the condition',
        required: false,
        options: ['once', 'continuous', 'daily', 'weekly']
      }
    ]
  },
  {
    id: 'scheduled-task',
    name: 'Scheduled Task',
    description: 'Execute actions at specific times',
    icon: '⏰',
    color: '#10b981',
    category: 'scheduling',
    template: '[when:time] [do:action]',
    properties: [
      {
        name: 'time',
        type: 'string',
        label: 'Time',
        description: 'When to execute the action',
        required: true
      },
      {
        name: 'action',
        type: 'string',
        label: 'Action',
        description: 'What action to execute',
        required: true
      },
      {
        name: 'repeat',
        type: 'boolean',
        label: 'Repeat',
        description: 'Should this repeat?',
        required: false,
        defaultValue: false
      }
    ]
  },
  {
    id: 'monitoring-agent',
    name: 'Monitoring Agent',
    description: 'Watch for changes and respond',
    icon: '👁️',
    color: '#8b5cf6',
    category: 'monitoring',
    template: '[monitor:what] [when:changes] [do:response]',
    properties: [
      {
        name: 'monitoredEntity',
        type: 'string',
        label: 'What to Monitor',
        description: 'What should be monitored',
        required: true
      },
      {
        name: 'changeCriteria',
        type: 'string',
        label: 'Change Criteria',
        description: 'What constitutes a meaningful change',
        required: true
      },
      {
        name: 'response',
        type: 'string',
        label: 'Response',
        description: 'How to respond to changes',
        required: true
      }
    ]
  },
  {
    id: 'communication-flow',
    name: 'Communication Flow',
    description: 'Manage communications and responses',
    icon: '💬',
    color: '#ec4899',
    category: 'communication',
    template: '[when:event] [contact:who] [message:what]',
    properties: [
      {
        name: 'triggerEvent',
        type: 'string',
        label: 'Trigger Event',
        description: 'What event triggers communication',
        required: true
      },
      {
        name: 'recipient',
        type: 'string',
        label: 'Recipient',
        description: 'Who to contact',
        required: true
      },
      {
        name: 'message',
        type: 'string',
        label: 'Message',
        description: 'What to communicate',
        required: true
      }
    ]
  },
  {
    id: 'context-aware',
    name: 'Context-Aware Automation',
    description: 'Act based on context and environment',
    icon: '🏠',
    color: '#f59e0b',
    category: 'automation',
    template: '[when:context] [if:conditions] [adjust:environment]',
    properties: [
      {
        name: 'context',
        type: 'string',
        label: 'Context',
        description: 'What context triggers the action',
        required: true
      },
      {
        name: 'conditions',
        type: 'string',
        label: 'Conditions',
        description: 'Additional conditions that must be met',
        required: false
      },
      {
        name: 'adjustment',
        type: 'string',
        label: 'Adjustment',
        description: 'How to adjust the environment',
        required: true
      }
    ]
  }
];
