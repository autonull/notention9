import {
  NoteTranslationStrategy,
  ClawdBotAction,
  ClawdBotConfiguration,
  Condition,
  Schedule,
  Trigger
} from './NoteTranslationStrategy';
import { TranslationContext } from './NoteTranslationStrategy';

export class HeuristicTranslationStrategy implements NoteTranslationStrategy {
  private readonly name = 'Heuristic Translation Strategy';
  private readonly priority = 100;

  canHandle(note: any): boolean {
    const content = (note.title || '') + ' ' + (note.content || '');
    const lowerContent = content.toLowerCase();

    // Look for common patterns that suggest automation needs
    const automationPatterns = [
      /remind.*me/i,
      /schedule.*for/i,
      /when.*then/i,
      /if.*then/i,
      /should.*do/i,
      /need.*to/i,
      /want.*to/i,
      /todo/i,
      /to-do/i,
      /do.*later/i,
      /call.*about/i,
      /email.*regarding/i,
      /buy.*for/i
    ];

    // Also check for property-style patterns like [action:...], [when:...], etc.
    const propertyPattern = /\[([a-z]+):/;
    const hasProperties = propertyPattern.test(content);

    return automationPatterns.some(pattern => pattern.test(lowerContent)) || hasProperties;
  }

  async translate(note: any): Promise<ClawdBotAction[] | ClawdBotConfiguration> {
    const actions: ClawdBotAction[] = [];
    const content = (note.title || '') + ' ' + (note.content || '');

    // Extract semantic properties like [action:...], [when:...], [if:...]
    const propertyPattern = /\[([^\]]+)\]/g;
    const properties: string[] = [];
    let match;
    while ((match = propertyPattern.exec(content)) !== null) {
      properties.push(match[1]);
    }

    // Process different types of properties
    const conditions = this.extractConditions(properties);
    const scheduledActions = this.extractScheduledActions(properties);
    const monitoringActions = this.extractMonitoringActions(properties);

    // Add actions based on extracted properties
    actions.push(...scheduledActions, ...monitoringActions);

    // Also look for natural language patterns
    const nlActions = await this.extractNaturalLanguageActions(content, note);
    actions.push(...nlActions);

    if (actions.length > 0) {
      return {
        id: `config-${note.id}`,
        type: 'workflow',
        settings: {
          noteId: note.id,
          noteTitle: note.title,
          source: 'heuristic'
        },
        triggers: [{
          type: 'note_change',
          conditions: conditions
        }],
        actions: actions
      };
    }

    // If no specific actions were identified, create a general monitoring action
    return {
      id: `monitor-${note.id}`,
      type: 'monitor',
      settings: {
        noteId: note.id,
        noteTitle: note.title,
        source: 'heuristic'
      },
      triggers: [{
        type: 'note_change',
        conditions: []
      }],
      actions: []
    };
  }

  private extractConditions(properties: string[]): Condition[] {
    const conditions: Condition[] = [];

    properties.forEach(prop => {
      if (prop.startsWith('if:') || prop.includes('when') || prop.includes('if')) {
        conditions.push({
          type: 'condition',
          expression: prop,
          parameters: {}
        });
      }
    });

    return conditions;
  }

  private extractScheduledActions(properties: string[]): ClawdBotAction[] {
    const actions: ClawdBotAction[] = [];

    properties.forEach(prop => {
      if (prop.startsWith('action:') || prop.startsWith('do:')) {
        const actionText = prop.split(':')[1]?.trim() || prop;
        actions.push({
          id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'execute',
          description: actionText,
          parameters: { action: actionText },
          priority: 1
        });
      }
    });

    return actions;
  }

  private extractMonitoringActions(properties: string[]): ClawdBotAction[] {
    const actions: ClawdBotAction[] = [];

    properties.forEach(prop => {
      if (prop.includes('monitor') || prop.includes('track') || prop.includes('watch')) {
        actions.push({
          id: `monitor-action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'monitor',
          description: `Monitor: ${prop}`,
          parameters: { monitor: prop },
          priority: 0
        });
      }
    });

    return actions;
  }

  private async extractNaturalLanguageActions(content: string, note: any): Promise<ClawdBotAction[]> {
    const actions: ClawdBotAction[] = [];
    const lowerContent = content.toLowerCase();

    // Look for reminder patterns
    if (/remind.*me.*to|remind.*about/i.test(lowerContent)) {
      actions.push({
        id: `reminder-${note.id}`,
        type: 'schedule_reminder',
        description: `Schedule reminder based on note: ${note.title || 'Untitled'}`,
        parameters: {
          content: note.content,
          title: note.title
        },
        priority: 2
      });
    }

    // Look for scheduling patterns
    if (/schedule.*for|book.*for|plan.*for/i.test(lowerContent)) {
      actions.push({
        id: `schedule-${note.id}`,
        type: 'create_calendar_event',
        description: `Create calendar event based on note: ${note.title || 'Untitled'}`,
        parameters: {
          content: note.content,
          title: note.title
        },
        priority: 2
      });
    }

    // Look for communication patterns
    if (/email|message|text|call|contact/i.test(lowerContent)) {
      actions.push({
        id: `communicate-${note.id}`,
        type: 'send_communication',
        description: `Send communication based on note: ${note.title || 'Untitled'}`,
        parameters: {
          content: note.content,
          title: note.title
        },
        priority: 2
      });
    }

    return actions;
  }

  getPriority(): number {
    return this.priority;
  }

  getName(): string {
    return this.name;
  }
}