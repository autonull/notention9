import { Note } from '../types/index.js';
import { UIMetaphor } from '../types/metaphor.js';
import { MetaphorRegistry } from './MetaphorRegistry.js';
import { logInfo } from '../utils/logging.js';

export class MetaphorMapper {
  private registry: MetaphorRegistry;

  constructor(registry: MetaphorRegistry) {
    this.registry = registry;
  }

  /**
   * Determine the best matching metaphor for a note based on its properties
   */
  mapToMetaphor(note: Note): UIMetaphor | null {
    // 1. Check if the note has an explicit metaphor property
    const explicitMetaphor = note.properties.find(p => p.key === 'metaphor' && p.operator === 'is');
    if (explicitMetaphor && explicitMetaphor.values.length > 0) {
      const metaphorId = explicitMetaphor.values[0];
      const metaphor = this.registry.getMetaphor(metaphorId);
      if (metaphor) {
        return metaphor;
      }
    }

    // 2. Infer metaphor from property keys
    const propertyKeys = new Set(note.properties.map(p => p.key.toLowerCase()));
    const metaphors = this.registry.getAllMetaphors();

    for (const metaphor of metaphors) {
      // Check if all required properties for this metaphor exist in the note
      const requiredProps = metaphor.properties.filter(p => p.required);
      if (requiredProps.length === 0) continue;

      const hasAllRequired = requiredProps.every(reqProp => {
        // Simple mapping: property name 'condition' -> key 'if' or 'condition'
        // This is a heuristic. In a real system, we might need more complex mapping config.
        if (reqProp.name === 'condition') return propertyKeys.has('if') || propertyKeys.has('condition');
        if (reqProp.name === 'action') return propertyKeys.has('then') || propertyKeys.has('do') || propertyKeys.has('action');
        if (reqProp.name === 'time') return propertyKeys.has('when') || propertyKeys.has('at') || propertyKeys.has('time');
        if (reqProp.name === 'monitoredEntity') return propertyKeys.has('monitor');

        return propertyKeys.has(reqProp.name.toLowerCase());
      });

      if (hasAllRequired) {
        return metaphor;
      }
    }

    // 3. Fallback: Conditional Automation if 'if' and 'then' exist
    if (propertyKeys.has('if') && (propertyKeys.has('then') || propertyKeys.has('do'))) {
      const metaphor = this.registry.getMetaphor('conditional-automation');
      if (metaphor) return metaphor;
    }

    return null;
  }

  /**
   * Apply a metaphor to a note (adding the explicit metaphor property)
   */
  applyMetaphor(note: Note, metaphor: UIMetaphor): Note {
    const updatedNote = { ...note };

    // Check if metaphor property already exists
    const existingPropIndex = updatedNote.properties.findIndex(p => p.key === 'metaphor');

    if (existingPropIndex >= 0) {
      // Update existing
      updatedNote.properties[existingPropIndex] = {
        key: 'metaphor',
        operator: 'is',
        values: [metaphor.id]
      };
    } else {
      // Add new
      updatedNote.properties.push({
        key: 'metaphor',
        operator: 'is',
        values: [metaphor.id]
      });
    }

    logInfo(`Applied metaphor ${metaphor.id} to note ${note.id}`, { noteId: note.id, metaphorId: metaphor.id });
    return updatedNote;
  }
}

// Export singleton instance initialized with the default registry
// Note: Dependencies like MetaphorRegistry should be injected, but for simplicity/singleton pattern we use the global instance.
// In a full DI system, this would be different.
export const metaphorMapper = new MetaphorMapper(MetaphorRegistry.getInstance());
