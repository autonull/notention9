import { Extension, ExtensionContext, ExtensionResult } from './ExtensionSystem';

/**
 * Extension for handling note monitoring and change detection
 */
export class MonitoringExtension implements Extension {
  private readonly id = 'note-monitoring';
  private readonly name = 'Note Monitoring Extension';
  private readonly description = 'Monitors notes for changes and triggers actions';
  private readonly version = '1.0.0';
  private readonly priority = 90;

  // Track monitored notes
  private monitoredNotes: Map<string, NoteMonitoringConfig> = new Map();

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getVersion(): string {
    return this.version;
  }

  getPriority(): number {
    return this.priority;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing ${this.name} extension`);
  }

  async destroy(): Promise<void> {
    console.log(`Destroying ${this.name} extension`);
    this.monitoredNotes.clear();
  }

  canHandle(context: ExtensionContext): boolean {
    // Handle note change events
    const eventType = context.request?.type || context.eventType;
    const note = context.request?.note || context.note;

    return (eventType === 'note_created' || eventType === 'note_updated' || eventType === 'note_deleted')
           && !!note?.id;
  }

  async execute(context: ExtensionContext): Promise<ExtensionResult> {
    const eventType = context.request?.type || context.eventType;
    const note = context.request?.note || context.note;

    if (!note?.id) {
      return {
        success: false,
        message: 'No note ID provided',
        continue: true
      };
    }

    switch (eventType) {
      case 'note_created':
        return await this.handleNoteCreated(note, context);
      case 'note_updated':
        return await this.handleNoteUpdated(note, context);
      case 'note_deleted':
        return await this.handleNoteDeleted(note, context);
      default:
        return {
          success: false,
          message: `Unknown event type: ${eventType}`,
          continue: true
        };
    }
  }

  private async handleNoteCreated(note: any, context: ExtensionContext): Promise<ExtensionResult> {
    // Check if this note should be monitored based on its content
    if (this.shouldMonitorNote(note)) {
      this.setupNoteMonitoring(note);

      return {
        success: true,
        message: `Started monitoring note: ${note.id}`,
        data: {
          noteId: note.id,
          monitoring: true,
          reason: 'Note contains monitor-worthy content'
        },
        continue: true
      };
    }

    return {
      success: true,
      message: `Note does not require monitoring: ${note.id}`,
      data: {
        noteId: note.id,
        monitoring: false
      },
      continue: true
    };
  }

  private async handleNoteUpdated(note: any, context: ExtensionContext): Promise<ExtensionResult> {
    // Check if the note is currently monitored
    if (this.monitoredNotes.has(note.id)) {
      // Get the previous version to compare changes
      const config = this.monitoredNotes.get(note.id)!;

      // Trigger any change-based actions
      await this.processNoteChanges(config, note, context);

      return {
        success: true,
        message: `Processed update for monitored note: ${note.id}`,
        data: {
          noteId: note.id,
          changesProcessed: true
        },
        continue: true
      };
    }

    // If not monitored but should be, start monitoring
    if (this.shouldMonitorNote(note)) {
      this.setupNoteMonitoring(note);

      return {
        success: true,
        message: `Started monitoring note after update: ${note.id}`,
        data: {
          noteId: note.id,
          monitoring: true,
          reason: 'Note updated to contain monitor-worthy content'
        },
        continue: true
      };
    }

    return {
      success: true,
      message: `Note not monitored: ${note.id}`,
      data: { noteId: note.id },
      continue: true
    };
  }

  private async handleNoteDeleted(note: any, context: ExtensionContext): Promise<ExtensionResult> {
    // Stop monitoring if the note was being monitored
    if (this.monitoredNotes.has(note.id)) {
      this.monitoredNotes.delete(note.id);

      return {
        success: true,
        message: `Stopped monitoring deleted note: ${note.id}`,
        data: {
          noteId: note.id,
          monitoringStopped: true
        },
        continue: true
      };
    }

    return {
      success: true,
      message: `Note was not being monitored: ${note.id}`,
      data: { noteId: note.id },
      continue: true
    };
  }

  private shouldMonitorNote(note: any): boolean {
    const content = (note.title || '') + ' ' + (note.content || '');
    const lowerContent = content.toLowerCase();

    // Monitor notes that contain certain keywords or patterns
    const monitorKeywords = [
      'monitor', 'track', 'watch', 'follow', 'keep eye on',
      'if', 'when', 'then', 'conditional', 'alert me',
      'remind', 'schedule', 'periodic', 'recurring'
    ];

    // Also monitor notes with semantic properties
    const hasProperties = /\[([a-z]+):/i.test(content);

    return monitorKeywords.some(keyword => lowerContent.includes(keyword)) || hasProperties;
  }

  private setupNoteMonitoring(note: any): void {
    const config: NoteMonitoringConfig = {
      noteId: note.id,
      createdAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      rules: this.extractMonitoringRules(note)
    };

    this.monitoredNotes.set(note.id, config);
    console.log(`Set up monitoring for note: ${note.id}`);
  }

  private extractMonitoringRules(note: any): MonitoringRule[] {
    const content = (note.title || '') + ' ' + (note.content || '');
    const rules: MonitoringRule[] = [];

    // Extract rules based on content
    if (/\b(remind|alert)\b/i.test(content)) {
      rules.push({
        type: 'notification',
        condition: 'change_occurs',
        action: 'notify_user'
      });
    }

    if (/\b(if|when)\b/i.test(content)) {
      rules.push({
        type: 'conditional',
        condition: 'pattern_match',
        action: 'execute_action'
      });
    }

    // Extract semantic properties as rules
    const propertyRegex = /\[([^\]]+)\]/g;
    let match;
    while ((match = propertyRegex.exec(content)) !== null) {
      const property = match[1];
      if (property.startsWith('if:') || property.includes('when:')) {
        rules.push({
          type: 'condition',
          condition: property,
          action: 'evaluate_and_act'
        });
      }
    }

    return rules;
  }

  private async processNoteChanges(prevConfig: NoteMonitoringConfig, newNote: any, context: ExtensionContext): Promise<void> {
    // Process any changes based on the monitoring rules
    console.log(`Processing changes for monitored note: ${newNote.id}`);

    // Update the last checked time
    prevConfig.lastChecked = new Date().toISOString();
  }
}

interface NoteMonitoringConfig {
  noteId: string;
  createdAt: string;
  lastChecked: string;
  rules: MonitoringRule[];
}

interface MonitoringRule {
  type: string;
  condition: string;
  action: string;
}