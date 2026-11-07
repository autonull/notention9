export * from './OntologyAdapter.js';
export { collectOntologyKeys, getCanonicalKey, getAliases, buildAttributeIndex, findNode, findNodeWithAttribute, findNodeIdForAttribute, getSubtreeKeys, findAttributeDef, addAttribute, addAliasToAttribute, addNode, deleteNode, deleteAttribute, mergeAttributes, renameAttribute, renameNode } from './ontologyCore.js';
export { buildWidgetMetadata, WidgetType } from './widgets.js';
export * from './lifecycle.js';
export * from './schema.js';
export { DEFAULT_ONTOLOGY } from './ontology.default.js';
export { OntologyService } from './ontologyService.js';