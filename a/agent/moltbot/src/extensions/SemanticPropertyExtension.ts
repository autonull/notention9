import { Extension, ExtensionContext, ExtensionResult } from './ExtensionSystem';

/**
 * Extension for handling semantic property processing
 */
export class SemanticPropertyExtension implements Extension {
  private readonly id = 'semantic-property-processor';
  private readonly name = 'Semantic Property Processor';
  private readonly description = 'Processes semantic properties in notes';
  private readonly version = '1.0.0';
  private readonly priority = 100;

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
  }

  canHandle(context: ExtensionContext): boolean {
    // Handle contexts that have note data with semantic properties
    const note = context.request?.note || context.note;
    if (!note) return false;

    const content = (note.title || '') + ' ' + (note.content || '');
    // Look for semantic property patterns like [property:value]
    return /\[([a-z]+):/i.test(content);
  }

  async execute(context: ExtensionContext): Promise<ExtensionResult> {
    const note = context.request?.note || context.note;
    if (!note) {
      return {
        success: false,
        message: 'No note provided',
        continue: true
      };
    }

    const content = (note.title || '') + ' ' + (note.content || '');

    // Extract semantic properties
    const propertyRegex = /\[([^\]]+)\]/g;
    const properties: string[] = [];
    let match;
    while ((match = propertyRegex.exec(content)) !== null) {
      properties.push(match[1]);
    }

    console.log(`Found ${properties.length} semantic properties in note:`, properties);

    // Process properties and potentially create actions
    const processedProperties = this.processProperties(properties);

    return {
      success: true,
      message: `Processed ${properties.length} semantic properties`,
      data: {
        properties,
        processed: processedProperties,
        noteId: note.id
      },
      continue: true // Allow other extensions to process as well
    };
  }

  private processProperties(properties: string[]): any[] {
    // Process different types of properties
    return properties.map(prop => {
      const [key, ...valueParts] = prop.split(':');
      const value = valueParts.join(':'); // Rejoin in case value contains colons

      return {
        key: key.trim(),
        value: value.trim(),
        type: this.getPropertyType(key.trim())
      };
    });
  }

  private getPropertyType(key: string): string {
    // Determine property type based on key
    const lowerKey = key.toLowerCase();

    if (['if', 'when', 'after', 'before', 'during'].includes(lowerKey)) {
      return 'condition';
    } else if (['action', 'do', 'execute', 'perform'].includes(lowerKey)) {
      return 'action';
    } else if (['schedule', 'time', 'date', 'period'].includes(lowerKey)) {
      return 'schedule';
    } else if (['monitor', 'watch', 'track', 'observe'].includes(lowerKey)) {
      return 'monitor';
    } else {
      return 'attribute';
    }
  }
}