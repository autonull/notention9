/**
 * Base Plugin Classes
 * Unified base classes eliminating boilerplate across all plugin types
 */

import { z } from 'zod';

// --- Base Plugin Interface ---

export interface BasePlugin<C extends Record<string, unknown> = Record<string, unknown>> {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema<C>;

    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

/**
 * Abstract base class for all instance-based plugins
 * Provides common config handling, init lifecycle, and name/description
 */
export abstract class AbstractBasePlugin<C extends Record<string, unknown> = Record<string, unknown>> implements BasePlugin<C> {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly configSchema?: z.ZodSchema<C>;

    abstract getDefaultConfig(): C;

    validateConfig(_config: C): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }
}

// --- Mixin for Registrable plugins ---
export type RegistrablePlugin<P extends BasePlugin> = P & {
    getDefaultConfig(): ReturnType<P['getDefaultConfig']>;
    validateConfig(config: ReturnType<P['getDefaultConfig']>): { valid: boolean; errors: string[] };
};

/**
 * Base class for plugins with async initialization
 * Adds init lifecycle and config management
 */
export abstract class AsyncInitPlugin<C extends Record<string, unknown> = Record<string, unknown>> extends AbstractBasePlugin<C> {
    protected initialized = false;
    protected config: C = {} as C;

    async init(config?: Partial<C>): Promise<void> {
        if (this.initialized) return;
        this.config = { ...this.getDefaultConfig(), ...config } as C;
        await this.onInit();
        this.initialized = true;
    }

    /** Override for plugin-specific initialization logic */
    protected async onInit(): Promise<void> {
        // no-op by default
    }

    getConfig(): C {
        return this.config;
    }
}

// --- Base Candidate Generator ---

import type { StrategyParamConfig, OptimizerCandidate, GeneratorOptions, CandidateProvenance } from '../optimizer/types.js';
import type { SearchSpace } from '../schemas/paramSpec.js';

export abstract class BaseCandidateGenerator extends AbstractBasePlugin<GeneratorOptions> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly configSchema?: z.ZodSchema<GeneratorOptions> = undefined;

    abstract getDefaultConfig(): GeneratorOptions;
    abstract getSearchSpace(strategy: StrategyParamConfig): SearchSpace;

    validateConfig(config: GeneratorOptions): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.maxCandidates !== undefined && (typeof config.maxCandidates !== 'number' || config.maxCandidates < 1)) {
            errors.push('maxCandidates must be a positive number');
        }
        return { valid: errors.length === 0, errors };
    }

    getName(): string {
        return this.name;
    }

    // Shared: check if a point equals the default point
    protected isDefaultPoint(paramSpec: Record<string, { default?: unknown }>, defaultProps: Record<string, unknown>, point: Record<string, unknown>): boolean {
        return Object.entries(point).every(([key, value]) => {
            const defaultVal = defaultProps[key] ?? paramSpec[key]?.default;
            return value === defaultVal;
        });
    }

    // Shared: create a candidate with standard provenance
    protected createCandidate(
        strategy: StrategyParamConfig,
        patch: Record<string, unknown>,
        generator: CandidateProvenance['generator'],
        seed?: number,
        extra?: Partial<CandidateProvenance>
    ): OptimizerCandidate {
        return {
            id: `cand_${strategy.seam.role}_${strategy.id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            seamRole: strategy.seam.role,
            strategyId: strategy.id,
            patch,
            paramSpec: strategy.paramSpec,
            provenance: {
                generator,
                seed: seed ?? 42,
                generatedAt: new Date().toISOString(),
                ...extra,
            },
        };
    }

    abstract generate(strategy: StrategyParamConfig, options: GeneratorOptions): OptimizerCandidate[] | Promise<OptimizerCandidate[]>;
}

// --- Base Revision Driver ---

import type { Revision, RevisionStatus, RevisionSearchQuery, RevisionDriverConfig } from '../telemetry/types.js';

export abstract class BaseRevisionDriver extends AsyncInitPlugin<RevisionDriverConfig> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly configSchema?: z.ZodSchema<RevisionDriverConfig> = undefined;

    protected revisions = new Map<string, Revision>();
    protected seamIndex = new Map<string, string[]>();
    protected statusIndex = new Map<RevisionStatus, Set<string>>();

    abstract getDefaultConfig(): RevisionDriverConfig;

    validateConfig(config: RevisionDriverConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        if (config.filePath && typeof config.filePath !== 'string') {
            errors.push('filePath must be a string');
        }
        if (config.dbPath && typeof config.dbPath !== 'string') {
            errors.push('dbPath must be a string');
        }
        if (config.maxRevisionsPerSeam && typeof config.maxRevisionsPerSeam !== 'number') {
            errors.push('maxRevisionsPerSeam must be a number');
        }
        return { valid: errors.length === 0, errors };
    }

    getName(): string {
        return this.name;
    }

    protected async onInit(): Promise<void> {
        // Default no-op - subclasses can override
    }

    protected indexRevision(revision: Revision): void {
        this.revisions.set(revision.id, revision);

        const seamRevisions = this.seamIndex.get(revision.seamRole) ?? [];
        seamRevisions.unshift(revision.id);
        this.seamIndex.set(revision.seamRole, seamRevisions);

        const statusSet = this.statusIndex.get(revision.status) ?? new Set();
        statusSet.add(revision.id);
        this.statusIndex.set(revision.status, statusSet);
    }

    protected removeFromIndex(revision: Revision): void {
        const seamRevisions = this.seamIndex.get(revision.seamRole);
        if (seamRevisions) {
            const idx = seamRevisions.indexOf(revision.id);
            if (idx >= 0) seamRevisions.splice(idx, 1);
        }
        const statusSet = this.statusIndex.get(revision.status);
        if (statusSet) {
            statusSet.delete(revision.id);
        }
    }

    protected updateIndex(revision: Revision): void {
        this.removeFromIndex(revision);
        this.indexRevision(revision);
    }

    async create(revision: Omit<Revision, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Revision> {
        await this.init(this.config);

        const now = new Date().toISOString();
        const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

        const fullRevision: Revision = {
            ...revision,
            id,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };

        this.indexRevision(fullRevision);
        await this.persistRevision(fullRevision);

        return fullRevision;
    }

    abstract persistRevision(revision: Revision): Promise<void>;

    async get(id: string): Promise<Revision | undefined> {
        await this.init(this.config);
        return this.revisions.get(id);
    }

    async getActive(seamRole: string): Promise<Revision | undefined> {
        await this.init(this.config);
        const ids = this.seamIndex.get(seamRole) ?? [];
        for (const id of ids) {
            const rev = this.revisions.get(id);
            if (rev && rev.status === 'active') return rev;
        }
        return undefined;
    }

    async updateStatus(id: string, status: RevisionStatus, metadata: Partial<Revision>): Promise<Revision | undefined> {
        await this.init(this.config);

        const revision = this.revisions.get(id);
        if (!revision) return undefined;

        const updated: Revision = {
            ...revision,
            status,
            updatedAt: new Date().toISOString(),
            ...metadata,
        };

        this.updateIndex(updated);
        await this.persistRevision(updated);

        return updated;
    }

    async activate(id: string, userId: string): Promise<Revision | undefined> {
        await this.init(this.config);

        const revision = await this.get(id);
        if (!revision) return undefined;

        const currentActive = await this.getActive(revision.seamRole);

        if (currentActive && currentActive.id !== id) {
            await this.updateStatus(currentActive.id, 'rolled-back', {
                rollbackReason: `Superseded by ${id}`,
                rolledBackAt: new Date().toISOString(),
            });
        }

        return this.updateStatus(id, 'active', {
            activatedAt: new Date().toISOString(),
            consentedBy: userId,
            consentedAt: new Date().toISOString(),
        });
    }

    async search(query: RevisionSearchQuery): Promise<Revision[]> {
        await this.init(this.config);

        let results = Array.from(this.revisions.values());

        if (query.seamRole) {
            results = results.filter(r => r.seamRole === query.seamRole);
        }
        if (query.status) {
            results = results.filter(r => r.status === query.status);
        }
        if (query.author) {
            results = results.filter(r => r.author === query.author);
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(r => r.tags?.some(t => query.tags!.includes(t)));
        }
        if (query.since) {
            const since = new Date(query.since).getTime();
            results = results.filter(r => new Date(r.createdAt).getTime() >= since);
        }
        if (query.until) {
            const until = new Date(query.until).getTime();
            results = results.filter(r => new Date(r.createdAt).getTime() <= until);
        }

        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (query.offset) {
            results = results.slice(query.offset);
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }

        return results;
    }

    async count(): Promise<number> {
        await this.init(this.config);
        return this.revisions.size;
    }

    async close(): Promise<void> {
        this.revisions.clear();
        this.seamIndex.clear();
        this.statusIndex.clear();
        this.initialized = false;
    }
}

// --- Base Resolution Strategy ---

import type { SeamRole } from '../ui/strategy.js';
import type { ResolutionContext, ResolvedStrategy, ResolutionStrategyConfig } from '../ui/resolutionStrategy.js';

export abstract class BaseResolutionStrategy extends AbstractBasePlugin<ResolutionStrategyConfig> {
    abstract readonly name: string;
    abstract readonly description: string;
    readonly seamRoles?: SeamRole[];
    readonly configSchema?: z.ZodSchema<ResolutionStrategyConfig> = undefined;

    getDefaultConfig(): ResolutionStrategyConfig {
        return {};
    }

    validateConfig(_config: ResolutionStrategyConfig): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }

    getName(): string {
        return this.name;
    }

    appliesTo(seamRole: SeamRole): boolean {
        return this.seamRoles === undefined || this.seamRoles.includes(seamRole);
    }

    abstract resolve(context: ResolutionContext): ResolvedStrategy | Promise<ResolvedStrategy | undefined> | undefined;
}

// --- Utility: create seeded random generator ---

export function createSeededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}