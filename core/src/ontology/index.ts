// New data-driven ontology loader (replaces hardcoded ontology)
export {
  loadOntology,
  getOntology,
  resetOntologyCache,
  getEffectiveOperators,
  getAllOperators,
  findNode as findNodeInMap,
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

export { DEFAULT_ONTOLOGY } from './ontology.default.js';

// Ontology mutation API (operates on OntologyNode[] arrays)
export { 
  buildAttributeIndex, 
  findNode,
  findNodeWithAttribute, 
  findNodeIdForAttribute, 
  getSubtreeKeys, 
  addAttribute, 
  addNode, 
  deleteNode, 
  deleteAttribute, 
  mergeAttributes, 
  renameAttribute, 
  renameNode,
  findAttributeDef as findAttributeDefInTree,
  collectOntologyKeys as collectOntologyKeysInTree,
  getSubtreeKeys as getSubtreeKeysInTree,
} from './ontologyCore.js';

export { buildWidgetMetadata, WidgetType } from './widgets.js';
export * from './lifecycle.js';
export * from './schema.js';
export * from './statistics.js';
export { OntologyService } from './ontologyService.js';
export * from './biologicalManifest.js';
export { survivalDomains, hazardDomain, resourceDomain, shelterDomain, medicalDomain, transportDomain, commsDomain } from './survivalDomains.js';