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
      if (metaphor) return metaphor;
    }

    // 2. Infer metaphor from property keys
    const propertyKeys = new Set(note.properties.map(p => p.key.toLowerCase()));
    const metaphors = this.registry.getAllMetaphors();

    for (const metaphor of metaphors) {
      const requiredProps = metaphor.properties.filter(p => p.required);
      if (requiredProps.length === 0) continue;

      const hasAllRequired = requiredProps.every(reqProp => {
        // Simple mapping: property name 'condition' -> key 'if' or 'condition'
        const name = reqProp.name.toLowerCase();
        if (name === 'condition') return propertyKeys.has('if') || propertyKeys.has('condition');
        if (name === 'action') return propertyKeys.has('then') || propertyKeys.has('do') || propertyKeys.has('action');
        if (name === 'time') return propertyKeys.has('when') || propertyKeys.has('at') || propertyKeys.has('time');
        if (name === 'monitoredentity') return propertyKeys.has('monitor');

        return propertyKeys.has(name);
      });

      if (hasAllRequired) return metaphor;
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
    const propertyIndex = updatedNote.properties.findIndex(p => p.key === 'metaphor');

    const metaphorProperty = {
      key: 'metaphor',
      operator: 'is',
      values: [metaphor.id]
    };

    if (propertyIndex >= 0) {
      updatedNote.properties[propertyIndex] = metaphorProperty;
    } else {
      updatedNote.properties.push(metaphorProperty);
    }

    logInfo(`Applied metaphor ${metaphor.id} to note ${note.id}`, { noteId: note.id, metaphorId: metaphor.id });
    return updatedNote;
  }
}

// Export singleton instance initialized with the default registry
export const metaphorMapper = new MetaphorMapper(MetaphorRegistry.getInstance());
