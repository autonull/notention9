import type { Property, OntologyNode, Note, OntologyMatchResult, OntologyValidationResult } from '../types/index.js';

export interface OntologyAdapter {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly extends?: string;  // Base adapter ID to extend

  // Core ontology access
  getRootNodes(): OntologyNode[];
  getNode(path: string): OntologyNode | null;
  getNodeByKey(key: string): OntologyNode | null;
  listProperties(): OntologyNode[];
  listOperators(key: string): string[];

  // Matching
  match(properties: Property[], interests: Property[]): OntologyMatchResult[];
  scoreMatch(properties: Property[], interests: Property[]): number;

  // Validation
  validate(note: Note): OntologyValidationResult;
  validateProperty(property: Property): OntologyValidationResult;
  suggestProperties(partial: Partial<Property>, context?: string[]): Property[];

  // Property operations
  getDefaultOperator(key: string): string | null;
  getAllowedOperators(key: string): string[];
  getAllowedValues(key: string): string[] | null;
  getConstraints(key: string): PropertyConstraints | null;

  // Evolution
  getVersion(): string;
  getChangelog(): OntologyChange[];
  isCompatibleWith(otherVersion: string): boolean;

  // Lifecycle
  initialize(): void | Promise<void>;
  destroy(): void | Promise<void>;
}

export interface PropertyConstraints {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  min?: number;
  max?: number;
  dependsOn?: string[];  // Other property keys this depends on
  conflictsWith?: string[];  // Other property keys this conflicts with
}

export interface OntologyChange {
  type: 'add' | 'modify' | 'remove' | 'deprecate';
  path: string;  // e.g., 'properties.skills.operators'
  before?: unknown;
  after?: unknown;
  reason: string;
  evidence: string[];
  author?: string;
  timestamp: Date;
  version: string;
}

export interface OntologyVersion {
  version: string;
  baseVersion?: string;
  changes: OntologyChange[];
  testResults?: Record<string, ScenarioTestResult>;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface ScenarioTestResult {
  scenario: string;
  matchRelevance: number;
  matchAcceptanceRate: number;
  timeToFirstMatch: number;
  agentEngagement: number;
  passed: boolean;
  issues: string[];
}

export interface OntologyConfiguration {
  adapterId: string;
  version: string;
  overrides?: Record<string, PropertyOverrides>;
  extensions?: PropertyExtension[];
  metadata?: Record<string, unknown>;
}

export interface PropertyOverrides {
  operators?: string[];
  defaultOperator?: string;
  allowedValues?: string[];
  constraints?: PropertyConstraints;
  description?: string;
  examples?: string[];
}

export interface PropertyExtension {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array';
  operators: string[];
  defaultOperator: string;
  allowedValues?: string[];
  constraints?: PropertyConstraints;
  description: string;
  examples: string[];
  category?: string;
  tags?: string[];
}

export class OntologyRegistry {
  private adapters = new Map<string, OntologyAdapter>();
  private activeAdapterId: string | null = null;
  private defaultAdapterId: string | null = null;
  private versions = new Map<string, OntologyVersion>();

  register(adapter: OntologyAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`Ontology Adapter '${adapter.id}' already registered`);
    }
    this.adapters.set(adapter.id, adapter);

    if (!this.defaultAdapterId) {
      this.defaultAdapterId = adapter.id;
    }
  }

  unregister(id: string): boolean {
    const adapter = this.adapters.get(id);
    if (!adapter) return false;

    if (this.activeAdapterId === id) {
      this.activeAdapterId = this.defaultAdapterId ?? null;
    }

    adapter.destroy();
    return this.adapters.delete(id);
  }

  get(id: string): OntologyAdapter | undefined {
    return this.adapters.get(id);
  }

  getActive(): OntologyAdapter | null {
    if (!this.activeAdapterId) return null;
    return this.adapters.get(this.activeAdapterId) ?? null;
  }

  setActive(id: string): boolean {
    if (!this.adapters.has(id)) return false;
    this.activeAdapterId = id;
    return true;
  }

  getActiveId(): string | null {
    return this.activeAdapterId;
  }

  list(): OntologyAdapter[] {
    return Array.from(this.adapters.values());
  }

  listIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  getDefault(): OntologyAdapter | null {
    if (!this.defaultAdapterId) return null;
    return this.adapters.get(this.defaultAdapterId) ?? null;
  }

  setDefault(id: string): boolean {
    if (!this.adapters.has(id)) return false;
    this.defaultAdapterId = id;
    if (!this.activeAdapterId) {
      this.activeAdapterId = id;
    }
    return true;
  }

  // Version management
  registerVersion(version: OntologyVersion): void {
    this.versions.set(version.version, version);
  }

  getVersion(version: string): OntologyVersion | undefined {
    return this.versions.get(version);
  }

  listVersions(): OntologyVersion[] {
    return Array.from(this.versions.values()).sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' })
    );
  }

  getLatestVersion(): OntologyVersion | undefined {
    const versions = this.listVersions();
    return versions[0];
  }
}

export const ontologyRegistry = new OntologyRegistry();