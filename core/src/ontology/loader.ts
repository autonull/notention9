import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { OntologyNode, OntologyAttribute } from '../types/index.js';

// Hardcoded project root since the relative resolution is unreliable in test environments
const PROJECT_ROOT = '/home/me/notention9';
const ONTOLOGY_ROOT = resolve(PROJECT_ROOT, 'ontology');

export interface OntologyConfig {
  version: string;
  modules: Array<{
    name: string;
    path: string;
    enabled?: boolean;
    priority?: number;
  }>;
  overrides?: Record<string, unknown>;
  featureFlags?: Record<string, boolean>;
}

export interface TypeDefinition {
  label: string;
  description: string;
  baseType?: string;
  operators?: { real: string[]; imaginary: string[] };
  constraints?: Record<string, unknown>;
  extraction?: { hints?: string[]; normalization?: string };
  ui?: { widget?: string; icon?: string };
  [key: string]: unknown;
}

export interface NodeDefinition {
  label: string;
  description: string;
  abstract?: boolean;
  extends?: string | string[];
  attributes: Record<string, AttributeDefinition>;
  [key: string]: unknown;
}

export interface AttributeDefinition {
  type: string;
  description?: string;
  icon?: string;
  required?: boolean;
  role?: 'marker' | 'constraint' | 'fact';
  referenceType?: string;
  default?: unknown;
  options?: string[];
  extends?: string;
}

export interface ModuleDefinition {
  name: string;
  path: string;
  extends?: string[];
  types?: Record<string, TypeDefinition>;
  nodes?: Record<string, NodeDefinition>;
}

export interface CompiledOntology {
  types: Map<string, TypeDefinition>;
  nodes: Map<string, OntologyNode>;
  attributes: Map<string, OntologyAttribute>;
  typeHierarchy: Map<string, string[]>;
  nodeHierarchy: Map<string, string[]>;
}

const DEFAULT_CONFIG_PATH = resolve(ONTOLOGY_ROOT, 'config.default.json');

const EMPTY_TYPE_DEF: TypeDefinition = { label: '', description: '', operators: { real: [], imaginary: [] } };
const EMPTY_NODE_DEF: NodeDefinition = { label: '', description: '', attributes: {} };

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function deepMerge(target: Record<string, unknown>, ...sources: Array<Record<string, unknown> | undefined>): Record<string, unknown> {
  const result = { ...target };
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const srcVal = source[key];
      const tgtVal = result[key];
      if (isPlainObject(srcVal) && isPlainObject(tgtVal)) {
        result[key] = deepMerge(tgtVal, srcVal);
      } else if (srcVal !== undefined) {
        result[key] = srcVal;
      }
    }
  }
  return result;
}

function loadModule(modulePath: string): ModuleDefinition {
  const fullPath = resolve(ONTOLOGY_ROOT, modulePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as ModuleDefinition;
}

function resolveTypeInheritance(types: Map<string, TypeDefinition>): Map<string, TypeDefinition> {
  const resolved = new Map<string, TypeDefinition>();

  function resolveType(name: string, visited: Set<string> = new Set<string>()): TypeDefinition {
    if (visited.has(name)) {
      throw new Error(`Circular type inheritance: ${name}`);
    }
    if (resolved.has(name)) return resolved.get(name)!;

    const def = types.get(name);
    if (!def) {
      return { label: name, description: '', operators: { real: ['is'], imaginary: [] } };
    }

    visited.add(name);
    let merged: TypeDefinition = { ...def };

    if (def.baseType) {
      const base = resolveType(def.baseType, visited);
      merged = deepMerge({ ...base }, def) as unknown as TypeDefinition;
    }

    visited.delete(name);
    resolved.set(name, merged);
    return merged;
  }

  for (const name of types.keys()) {
    resolveType(name);
  }

  return resolved;
}

function compileNodes(
  nodeDefs: Map<string, NodeDefinition>,
  types: Map<string, TypeDefinition>
): Map<string, OntologyNode> {
  const compiled = new Map<string, OntologyNode>();
  const nodeHierarchy = new Map<string, string[]>();

  function getParents(nodeName: string, visited = new Set<string>()): string[] {
    if (visited.has(nodeName)) return [];
    const def = nodeDefs.get(nodeName);
    if (!def || !def.extends) return [];
    visited.add(nodeName);
    const parents = Array.isArray(def.extends) ? def.extends : [def.extends];
    const allParents: string[] = [];
    for (const p of parents) {
      allParents.push(p, ...getParents(p, visited));
    }
    visited.delete(nodeName);
    return allParents;
  }

  function compileNode(name: string): OntologyNode {
    if (compiled.has(name)) return compiled.get(name)!;

    const def = nodeDefs.get(name);
    if (!def) {
      throw new Error(`Node definition not found: ${name}`);
    }

    const parents = getParents(name);
    nodeHierarchy.set(name, parents);

    let mergedAttributes: Record<string, OntologyAttribute> = {};
    for (const parent of [...parents].reverse()) {
      const parentNode = compiled.get(parent);
      if (parentNode) {
        mergedAttributes = { ...mergedAttributes, ...parentNode.attributes };
      }
    }

    for (const [attrName, attrDef] of Object.entries(def.attributes ?? {})) {
      const typeDef = types.get(attrDef.type);
      const effectiveOperators = typeDef?.operators ?? { real: ['is'], imaginary: [] };

      mergedAttributes[attrName] = {
        key: attrName,
        type: attrDef.type,
        description: attrDef.description,
        icon: attrDef.icon,
        role: attrDef.role,
        required: attrDef.required,
        referenceType: attrDef.referenceType,
        operators: effectiveOperators,
        default: attrDef.default,
        options: attrDef.options,
        extends: attrDef.extends
      } as OntologyAttribute;
    }

    const node: OntologyNode = {
      id: name,
      label: def.label,
      description: def.description,
      abstract: def.abstract ?? false,
      attributes: mergedAttributes,
      children: []
    };

    compiled.set(name, node);
    return node;
  }

  for (const name of nodeDefs.keys()) {
    compileNode(name);
  }

  for (const [name, node] of compiled) {
    const def = nodeDefs.get(name);
    if (def?.extends) {
      const parents = Array.isArray(def.extends) ? def.extends : [def.extends];
      for (const parent of parents) {
        const parentNode = compiled.get(parent);
        if (parentNode) {
          (parentNode.children ??= []).push(node);
        }
      }
    }
  }

  return compiled;
}

export function loadOntology(configPath: string = DEFAULT_CONFIG_PATH): CompiledOntology {
  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as OntologyConfig;

  const sortedModules = [...config.modules]
    .filter(m => m.enabled !== false)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const allTypes = new Map<string, TypeDefinition>();
  const allNodes = new Map<string, NodeDefinition>();

  for (const mod of sortedModules) {
    try {
      const module = loadModule(mod.path);

      if (module.types) {
        for (const [name, def] of Object.entries(module.types)) {
          const existing = allTypes.get(name) ?? EMPTY_TYPE_DEF;
          allTypes.set(name, deepMerge({ ...existing }, def) as unknown as TypeDefinition);
        }
      }

      if (module.nodes) {
        for (const [name, def] of Object.entries(module.nodes)) {
          const existing = allNodes.get(name) ?? EMPTY_NODE_DEF;
          allNodes.set(name, deepMerge({ ...existing }, def) as unknown as NodeDefinition);
        }
      }
    } catch (err) {
      console.error(`[Ontology] Failed to load module ${mod.name} from ${mod.path}:`, err);
      throw err;
    }
  }

  if (config.overrides) {
    if (config.overrides.types) {
      for (const [name, def] of Object.entries(config.overrides.types as Record<string, TypeDefinition>)) {
        const existing = allTypes.get(name) ?? EMPTY_TYPE_DEF;
        allTypes.set(name, deepMerge({ ...existing }, def) as unknown as TypeDefinition);
      }
    }
    if (config.overrides.nodes) {
      for (const [name, def] of Object.entries(config.overrides.nodes as Record<string, NodeDefinition>)) {
        const existing = allNodes.get(name) ?? EMPTY_NODE_DEF;
        allNodes.set(name, deepMerge({ ...existing }, def) as unknown as NodeDefinition);
      }
    }
  }

  const resolvedTypes = resolveTypeInheritance(allTypes);
  const compiledNodes = compileNodes(allNodes, resolvedTypes);

  const allAttributes = new Map<string, OntologyAttribute>();
  for (const node of compiledNodes.values()) {
    for (const [key, attr] of Object.entries(node.attributes ?? {})) {
      allAttributes.set(`${node.id}.${key}`, attr);
    }
  }

  return {
    types: resolvedTypes,
    nodes: compiledNodes,
    attributes: allAttributes,
    typeHierarchy: new Map(),
    nodeHierarchy: new Map()
  };
}

export function getEffectiveOperators(
  attribute: OntologyAttribute,
  types: Map<string, TypeDefinition>
): { real: string[]; imaginary: string[] } {
  const typeDef = attribute.type ? types.get(attribute.type) : null;
  const defaults = typeDef?.operators ?? { real: ['is'], imaginary: [] };

  if (attribute.operators) {
    return {
      real: (attribute.operators.real ?? []).filter(op => defaults.real.includes(op)),
      imaginary: (attribute.operators.imaginary ?? []).filter(op => defaults.imaginary.includes(op))
    };
  }

  return defaults;
}

export function getAllOperators(
  attribute: OntologyAttribute,
  types: Map<string, TypeDefinition>
): string[] {
  const { real, imaginary } = getEffectiveOperators(attribute, types);
  return [...real, ...imaginary];
}

export function findNode(nodes: Map<string, OntologyNode>, id: string): OntologyNode | undefined {
  return nodes.get(id);
}

export function findAttributeDef(
  nodes: Map<string, OntologyNode>,
  _nodeId: string,
  attrKey: string
): OntologyAttribute | undefined {
  for (const node of nodes.values()) {
    if (node.attributes?.[attrKey]) return node.attributes[attrKey];
  }
  return undefined;
}

export function findNodesWithAttribute(
  nodes: Map<string, OntologyNode>,
  attrKey: string
): OntologyNode[] {
  const result: OntologyNode[] = [];
  for (const node of nodes.values()) {
    if (node.attributes?.[attrKey]) result.push(node);
  }
  return result;
}

export function getSubtreeNodes(
  nodes: Map<string, OntologyNode>,
  rootId: string
): OntologyNode[] {
  const result: OntologyNode[] = [];
  const root = nodes.get(rootId);
  if (!root) return result;

  function collect(node: OntologyNode) {
    result.push(node);
    for (const child of node.children ?? []) {
      collect(child);
    }
  }

  collect(root);
  return result;
}

export function collectOntologyKeys(nodes: Map<string, OntologyNode> | OntologyNode[]): string[] {
  const keys = new Set<string>();
  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes;
  for (const node of nodeArray) {
    keys.add(node.id);
    for (const attrKey of Object.keys(node.attributes ?? {})) {
      keys.add(attrKey);
      keys.add(`${node.id}.${attrKey}`);
    }
  }
  return Array.from(keys).sort();
}

let cachedOntology: CompiledOntology | null = null;

export function getOntology(configPath?: string): CompiledOntology {
  if (!cachedOntology) {
    cachedOntology = loadOntology(configPath);
  }
  return cachedOntology;
}

export function resetOntologyCache(): void {
  cachedOntology = null;
}