// New data-driven ontology loader (replaces hardcoded ontology)
export {
  loadOntology,
  getOntology,
  resetOntologyCache,
  getEffectiveOperators,
  getAllOperators,
  findNode,
  findAttributeDef,
  findNodesWithAttribute,
  getSubtreeNodes,
  collectOntologyKeys,
  type OntologyConfig,
  type CompiledOntology,
  type TypeDefinition,
  type NodeDefinition,
  type AttributeDefinition
} from './loader.js';

// Legacy exports for backward compatibility (DEPRECATED - will be removed)
export * from './OntologyAdapter.js';
export { collectOntologyKeys as legacyCollectOntologyKeys, buildAttributeIndex, findNode as legacyFindNode, findNodeWithAttribute, findNodeIdForAttribute, getSubtreeKeys, findAttributeDef as legacyFindAttributeDef, addAttribute, addNode, deleteNode, deleteAttribute, mergeAttributes, renameAttribute, renameNode } from './ontologyCore.js';
export { DEFAULT_OPERATORS_BY_TYPE, getEffectiveOperators as legacyGetEffectiveOperators, getAllOperators as legacyGetAllOperators } from './operators.js';
export type { OperatorPair } from './operators.js';
export { buildWidgetMetadata, WidgetType } from './widgets.js';
export * from './lifecycle.js';
export * from './schema.js';
export * from './statistics.js';
export { DEFAULT_ONTOLOGY } from './ontology.default.js';
export { OntologyService } from './ontologyService.js';
export * from './biologicalManifest.js';
export { survivalDomains, hazardDomain, resourceDomain, shelterDomain, medicalDomain, transportDomain, commsDomain } from './survivalDomains.js';