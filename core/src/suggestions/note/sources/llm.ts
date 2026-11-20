import type { Note, OntologyNode, Property } from '../../../types/index.js';
import type { SuggestionGenerationContext, NoteSuggestion, SourcePlugin } from '../types.js';
import { PropertyExtractor } from '../../../notes/propertyExtractor/PropertyExtractor.js';
import { redactPIIForTransport } from '../../../utils/piiRedaction.js';
import { CapabilityManager, type CapabilityType } from '../../../security/CapabilityManager.js';
import { shortSha256 } from '../../../utils/common.shared.js';

export interface LlmClient {
  complete(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string>;
}

export interface LlmSourceConfig {
  client: LlmClient;
  ontology: OntologyNode[];
  capabilityManager: CapabilityManager;
  enabled: boolean;
  maxSuggestions: number;
}

export class LlmSource implements SourcePlugin {
  name = 'llm' as const;
  private config: LlmSourceConfig;
  private extractor: PropertyExtractor;

  constructor(config: LlmSourceConfig) {
    this.config = config;
    this.extractor = new PropertyExtractor(config.ontology);
  }

  async generate(context: SuggestionGenerationContext): Promise<NoteSuggestion[]> {
    if (!this.config.enabled) return [];

    const { note, existingSuggestions } = context;
    const suggestions: NoteSuggestion[] = [];

    const missingProperties = this.findMissingProperties(note);
    if (missingProperties.length === 0) return [];

    const hasConsent = this.checkConsent(note);
    if (!hasConsent) return [];

    const prompt = this.buildPrompt(note, missingProperties);
    const redactedPrompt = redactPIIForTransport(prompt);

    try {
      const response = await this.config.client.complete(redactedPrompt, {
        temperature: 0.3,
        maxTokens: 500
      });

      const llmSuggestions = this.parseResponse(note, response, missingProperties);
      
      for (const suggestion of llmSuggestions.slice(0, this.config.maxSuggestions)) {
        if (!this.isDuplicate(suggestion, existingSuggestions)) {
          suggestion.generationId = context.generationId || `gen-${Date.now()}`;
          suggestions.push(suggestion);
        }
      }
    } catch (error) {
      console.warn('LLM suggestion generation failed:', error);
    }

    return suggestions;
  }

  private findMissingProperties(note: Note): string[] {
    const typeProp = note.properties.find(p => p.key === 'type');
    if (!typeProp) return [];

    const nodeType = typeProp.values[0];
    const ontologyService = this.extractor.getOntologyService();
    const node = ontologyService.getNode(nodeType);
    if (!node?.requiredAttributes) return [];

    const existingKeys = new Set(note.properties.map(p => p.key));
    return node.requiredAttributes.filter(key => !existingKeys.has(key));
  }

  private checkConsent(note: Note): boolean {
    const permissions = this.config.capabilityManager.extractPermissions(note.properties);
    const requiredCapability: CapabilityType = 'network:fetch';
    return this.config.capabilityManager.checkPermission(requiredCapability, '*', permissions);
  }

  private buildPrompt(note: Note, missingProperties: string[]): string {
    const ontologyService = this.extractor.getOntologyService();
    const propertyDetails = missingProperties.map(key => {
      const attr = ontologyService.getAttribute(key);
      return `- ${key}: ${attr?.description || 'No description'} (type: ${attr?.type || 'string'}, operators: ${attr?.operators?.real?.join(', ') || 'is'})`;
    }).join('\n');

    return `Given the following note, suggest values for missing required properties.

Note:
Title: ${note.title}
Content: ${note.content}
Existing properties: ${note.properties.map(p => `${p.key}: ${p.operator} ${p.values.join(', ')}`).join('; ')}

Missing required properties:
${propertyDetails}

Return a JSON array of suggestions, each with:
- key: property key
- operator: operator to use
- value: suggested value
- reason: brief explanation
- confidence: 0-1 confidence score

Only suggest for properties where you have reasonable confidence.`;
  }

  private parseResponse(note: Note, response: string, missingProperties: string[]): NoteSuggestion[] {
    try {
      const parsed = JSON.parse(response);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(item => 
          item.key && 
          missingProperties.includes(item.key) &&
          typeof item.confidence === 'number' &&
          item.confidence > 0.5
        )
        .map(item => this.createLlmSuggestion(note, item));
    } catch {
      return [];
    }
  }

  private createLlmSuggestion(note: Note, item: { key: string; operator: string; value: string; reason: string; confidence: number }): NoteSuggestion {
    const evidence = {
      source: 'llm' as const,
      confidence: item.confidence,
      details: { reason: item.reason }
    };

    return {
      id: generateSuggestionId(note.id, item.key, 'llm'),
      noteId: note.id,
      kind: 'add-property',
      status: 'active',
      title: `Add ${item.key} (AI suggested)`,
      description: item.reason,
      evidence: [evidence],
      proposedChange: {
        type: 'add',
        property: {
          key: item.key,
          operator: item.operator,
          values: [item.value],
          provenance: 'ai',
          confidence: item.confidence
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      generationId: ''
    };
  }

  private isDuplicate(suggestion: NoteSuggestion, existing: NoteSuggestion[]): boolean {
    return existing.some(e => 
      e.noteId === suggestion.noteId &&
      e.kind === suggestion.kind &&
      e.proposedChange?.property?.key === suggestion.proposedChange?.property?.key &&
      e.status === 'active'
    );
  }
}

function generateSuggestionId(noteId: string, key: string, source: string): string {
  return `sugg-${shortSha256(`${noteId}|${key}|${source}`)}`;
}

export function createLlmSource(config: LlmSourceConfig): LlmSource {
  return new LlmSource(config);
}