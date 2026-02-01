import {
  NoteTranslationStrategy,
  ClawdBotAction,
  ClawdBotConfiguration,
  Condition,
  Trigger
} from './NoteTranslationStrategy';

export class PatternMatchingStrategy implements NoteTranslationStrategy {
  private readonly name = 'Pattern Matching Strategy';
  private readonly priority = 90;

  // Define patterns for different types of notes
  private readonly patterns = [
    {
      id: 'reminder_pattern',
      regex: /remind.*me.*(to|about|that).*|set.*reminder/i,
      actionType: 'schedule_reminder',
      description: 'Schedule a reminder'
    },
    {
      id: 'schedule_pattern',
      regex: /schedule|book|plan|arrange.*for|appointment.*with/i,
      actionType: 'create_schedule',
      description: 'Create a schedule/appointment'
    },
    {
      id: 'communication_pattern',
      regex: /email|send.*message|text|call|contact.*about/i,
      actionType: 'send_communication',
      description: 'Send a communication'
    },
    {
      id: 'task_pattern',
      regex: /todo|to-do|task|do.*later|need.*to.*do/i,
      actionType: 'create_task',
      description: 'Create a task'
    },
    {
      id: 'shopping_pattern',
      regex: /buy|purchase|order|get.*from|shop.*for/i,
      actionType: 'create_shopping_list',
      description: 'Add to shopping list'
    },
    {
      id: 'health_pattern',
      regex: /medication|take.*pill|doctor.*appointment|exercise|workout/i,
      actionType: 'health_reminder',
      description: 'Health-related action'
    }
  ];

  // Semantic property patterns
  private readonly propertyPatterns = [
    {
      id: 'conditional_property',
      regex: /if[:\s]|when[:\s]|condition[:\s]/i,
      actionType: 'conditional_action',
      description: 'Conditional execution'
    },
    {
      id: 'action_property',
      regex: /action[:\s]|do[:\s]|execute[:\s]/i,
      actionType: 'execute_action',
      description: 'Direct action'
    },
    {
      id: 'schedule_property',
      regex: /schedule[:\s]|time[:\s]|when[:\s]/i,
      actionType: 'schedule_action',
      description: 'Scheduled action'
    },
    {
      id: 'monitor_property',
      regex: /monitor[:\s]|track[:\s]|watch[:\s]/i,
      actionType: 'monitor_condition',
      description: 'Monitor condition'
    }
  ];

  canHandle(note: any): boolean {
    const content = (note.title || '') + ' ' + (note.content || '');

    // Check for pattern matches
    for (const pattern of this.patterns) {
      if (pattern.regex.test(content)) {
        return true;
      }
    }

    // Check for property pattern matches
    for (const propPattern of this.propertyPatterns) {
      if (propPattern.regex.test(content)) {
        return true;
      }
    }

    // Check for semantic properties like [if:...], [action:...], etc.
    const semanticPropertyRegex = /\[[a-z]+:/i;
    if (semanticPropertyRegex.test(content)) {
      return true;
    }

    return false;
  }

  async translate(note: any): Promise<ClawdBotAction[] | ClawdBotConfiguration> {
    const content = (note.title || '') + ' ' + (note.content || '');
    const actions: ClawdBotAction[] = [];

    // Match against natural language patterns
    for (const pattern of this.patterns) {
      if (pattern.regex.test(content)) {
        actions.push({
          id: `${pattern.id}-${note.id}-${Date.now()}`,
          type: pattern.actionType,
          description: `${pattern.description} from note: ${note.title || 'Untitled'}`,
          parameters: {
            noteId: note.id,
            noteTitle: note.title,
            noteContent: note.content,
            matchedPattern: pattern.id
          },
          priority: this.calculatePriority(pattern.actionType)
        });
      }
    }

    // Match against semantic properties
    const propertyMatches = this.extractSemanticProperties(content);
    for (const propMatch of propertyMatches) {
      for (const propPattern of this.propertyPatterns) {
        if (propPattern.regex.test(propMatch)) {
          actions.push({
            id: `${propPattern.id}-${note.id}-${Date.now()}`,
            type: propPattern.actionType,
            description: `${propPattern.description} from property: ${propMatch}`,
            parameters: {
              noteId: note.id,
              property: propMatch,
              matchedPattern: propPattern.id
            },
            priority: this.calculatePriority(propPattern.actionType)
          });
        }
      }
    }

    // Create configuration if we have actions
    if (actions.length > 0) {
      return {
        id: `config-${note.id}`,
        type: 'pattern_based_workflow',
        settings: {
          noteId: note.id,
          noteTitle: note.title,
          source: 'pattern_matching',
          matchedPatterns: this.getMatchedPatternIds(content)
        },
        triggers: this.createTriggers(propertyMatches),
        actions: actions
      };
    }

    // If no specific actions, return a monitoring configuration
    return {
      id: `monitor-${note.id}`,
      type: 'monitor',
      settings: {
        noteId: note.id,
        noteTitle: note.title,
        source: 'pattern_matching'
      },
      triggers: [{
        type: 'note_change',
        conditions: []
      }],
      actions: []
    };
  }

  private extractSemanticProperties(content: string): string[] {
    const propertyRegex = /\[([^\]]+)\]/g;
    const properties: string[] = [];
    let match;

    while ((match = propertyRegex.exec(content)) !== null) {
      properties.push(match[1]);
    }

    return properties;
  }

  private createTriggers(properties: string[]): Trigger[] {
    const triggers: Trigger[] = [];

    // Create triggers based on properties
    for (const prop of properties) {
      if (prop.startsWith('if:') || prop.includes('when:')) {
        triggers.push({
          type: 'condition_met',
          conditions: [{
            type: 'property_condition',
            expression: prop,
            parameters: { property: prop }
          }]
        });
      }
    }

    // If no conditional triggers, create a default note change trigger
    if (triggers.length === 0) {
      triggers.push({
        type: 'note_change',
        conditions: []
      });
    }

    return triggers;
  }

  private getMatchedPatternIds(content: string): string[] {
    const matchedIds: string[] = [];

    for (const pattern of this.patterns) {
      if (pattern.regex.test(content)) {
        matchedIds.push(pattern.id);
      }
    }

    return matchedIds;
  }

  private calculatePriority(actionType: string): number {
    // Higher priority for more urgent actions
    switch (actionType) {
      case 'health_reminder':
      case 'schedule_reminder':
        return 3;
      case 'send_communication':
      case 'create_schedule':
        return 2;
      case 'create_task':
      case 'create_shopping_list':
        return 1;
      default:
        return 0;
    }
  }

  getPriority(): number {
    return this.priority;
  }

  getName(): string {
    return this.name;
  }
}