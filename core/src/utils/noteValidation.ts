import type { Note, OntologyNode } from '../types/index.js';
import { getCanonicalKey, traverseTree } from '../ontology/ontologyHelpers.js';
import { validatePropertyCore } from './propertyValidation.js';
import { createValidationContext } from './validationContext.js';
import type { ValidationResult } from './validationTypes.js';

export function validateNote(note: Note, ontology: OntologyNode[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const context = createValidationContext(ontology);
  const propertyResults = note.properties.map(p =>
    validatePropertyCore(p, context, true, ontology, false)
  );
  errors.push(
    ...propertyResults.flatMap((r, i) =>
      r.isValid ? [] : r.errors.map(e => `Property '${note.properties[i].key}': ${e}`)
    )
  );
  warnings.push(...propertyResults.flatMap(r => r.warnings ?? []));

  const noteCanonicalKeys = new Set(note.properties.map(p => getCanonicalKey(p.key, ontology)));

  traverseTree(ontology, node => {
    if (node.requiredAttributes?.length) {
      const nodeKeys = Object.keys(node.attributes ?? {});
      if (nodeKeys.some(key => noteCanonicalKeys.has(key))) {
        for (const reqKey of node.requiredAttributes) {
          if (!noteCanonicalKeys.has(reqKey)) {
            errors.push(`Missing required property: '${reqKey}' (for ${node.label}).`);
          }
        }
      }
    }
    return false;
  });

  return { isValid: errors.length === 0, errors, warnings };
}