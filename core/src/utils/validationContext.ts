import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { OntologyService } from '../ontology/ontologyService.js';
import { findAttributeDef, buildAttributeIndex } from '../ontology/ontologyCore.js';

export interface ValidationContext {
  getAttribute(key: string): OntologyAttribute | null;
  getValidOperators(key: string): string[];
  getEnumOptions(key: string): string[] | null;
}

export function createValidationContext(ontology: OntologyNode[] | OntologyService): ValidationContext {
  if (ontology instanceof OntologyService) {
    return {
      getAttribute: (key) => ontology.getAttribute(key),
      getValidOperators: (key) => ontology.getValidOperators(key),
      getEnumOptions: (key) => ontology.getEnumOptions(key),
    };
  }
  const attrIndex = buildAttributeIndex(ontology);
  return {
    getAttribute: (key) => attrIndex.get(key) ?? null,
    getValidOperators: (key) => {
      const attr = attrIndex.get(key);
      if (!attr) return [];
      return [...(attr.operators.real ?? []), ...(attr.operators.imaginary ?? [])];
    },
    getEnumOptions: (key) => {
      const attr = attrIndex.get(key);
      return attr?.options ?? null;
    },
  };
}

export function findAttributeDefInContext(key: string, context: ValidationContext): OntologyAttribute | null {
  return context.getAttribute(key);
}