import { readFile, writeFile, mkdir, rm, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CandidateStrategy, CandidateDir, StrategyArtifact } from './spec/index.js';
import type { EvaluationReport, CandidateEvaluation } from './evaluation/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Strategy adoption system - handles versioning, feature flags, rollback, and provenance
 * @deprecated Use RevisionStore instead. Ledger-as-delivery-record is dead; revisions are the record.
 * This module will be removed in a future version.
 */

export interface AdoptionConfig {
    strategiesDir: string;
    flagsDir: string;
    ledgerFile: string;
    defaultEnabled: boolean;
}

export interface AdoptionRecord {
    strategyId: string;
    artifact: StrategyArtifact;
    evaluation: CandidateEvaluation;
    adoptedAt: string;
    adoptedBy: string;
    flagKey: string;
    enabled: boolean;
    provenance: StrategyArtifact['provenance'];
}

export interface LedgerEntry {
    id: string;
    type: 'adopt' | 'rollback' | 'enable' | 'disable' | 'update';
    strategyId: string;
    artifactVersion: string;
    timestamp: string;
    actor: string;
    reason: string;
    previousState?: string;
    newState?: string;
}

export class StrategyAdoption {
    private config: AdoptionConfig;
    private ledger: LedgerEntry[] = [];

    constructor(config: Partial<AdoptionConfig> = {}) {
        console.warn('⚠️  StrategyAdoption is deprecated. Use RevisionStore instead. Ledger-as-delivery-record is dead; revisions are the record.');
        this.config = {
            strategiesDir: config.strategiesDir || 'adopted-strategies',
            flagsDir: config.flagsDir || 'feature-flags',
            ledgerFile: config.ledgerFile || 'adoption-ledger.jsonl',
            defaultEnabled: config.defaultEnabled ?? false,
        };
        this.loadLedger();
    }

    private async loadLedger(): Promise<void> {
        try {
            const content = await readFile(this.config.ledgerFile, 'utf-8');
            this.ledger = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
        } catch {
            // File doesn't exist yet
        }
    }

    private async appendLedger(entry: LedgerEntry): Promise<void> {
        this.ledger.push(entry);
        await mkdir(dirname(this.config.ledgerFile), { recursive: true });
        await writeFile(this.config.ledgerFile, this.ledger.map(e => JSON.stringify(e)).join('\n') + '\n', { flag: 'a' });
    }

    /**
     * Adopt a winning candidate strategy
     */
    async adopt(
        candidate: CandidateStrategy,
        evaluation: CandidateEvaluation,
        options: { actor: string; reason: string; enabled?: boolean } = { actor: 'system', reason: '', enabled: false }
    ): Promise<StrategyArtifact> {
        // Create artifact from candidate
        const artifact: StrategyArtifact = {
            id: candidate.id,
            kind: 'ui',
            version: this.generateVersion(candidate),
            interface: candidate.spec.seam,
            config: {},
            requires: [],
            provenance: {
                ...candidate.provenance,
                author: options.actor === 'system' ? 'model' : 'human',
                date: new Date().toISOString(),
                evidenceBundle: 'evaluation-report.json',
            },
        };
        
        // Save artifact
        const artifactPath = join(this.config.strategiesDir, `${candidate.id}.json`);
        await mkdir(dirname(artifactPath), { recursive: true });
        await writeFile(artifactPath, JSON.stringify(artifact, null, 2));

        // Create feature flag
        const flagKey = `strategy-${candidate.id}`;
        await this.setFlag(flagKey, options.enabled ?? this.config.defaultEnabled);

        // Record adoption
        const record: AdoptionRecord = {
            strategyId: candidate.id,
            artifact,
            evaluation,
            adoptedAt: new Date().toISOString(),
            adoptedBy: options.actor,
            flagKey,
            enabled: options.enabled ?? this.config.defaultEnabled,
            provenance: artifact.provenance,
        };

        const recordPath = join(this.config.strategiesDir, `${candidate.id}.adoption.json`);
        await writeFile(recordPath, JSON.stringify(record, null, 2));

        // Append to ledger
        await this.appendLedger({
            id: `adopt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'adopt',
            strategyId: candidate.id,
            artifactVersion: artifact.version,
            timestamp: new Date().toISOString(),
            actor: options.actor,
            reason: options.reason,
            newState: JSON.stringify({ strategyId: candidate.id, version: artifact.version, flagKey, enabled: record.enabled }),
        });

        console.log(`✅ Adopted ${candidate.id} v${artifact.version} (flag: ${flagKey}, enabled: ${options.enabled ?? this.config.defaultEnabled})`);
        
        return artifact;
    }

    /**
     * Rollback an adopted strategy
     */
    async rollback(strategyId: string, options: { actor: string; reason: string }): Promise<boolean> {
        const artifactPath = join(this.config.strategiesDir, `${strategyId}.json`);
        const recordPath = join(this.config.strategiesDir, `${strategyId}.adoption.json`);

        try {
            await readFile(recordPath, 'utf-8');
        } catch {
            console.log(`❌ Strategy ${strategyId} not found for rollback`);
            return false;
        }

        const previousRecord = JSON.parse(await readFile(recordPath, 'utf-8'));

        // Disable feature flag
        await this.setFlag(previousRecord.flagKey, false);

        // Move artifact to archive
        const archivePath = join(this.config.strategiesDir, 'archive', `${strategyId}-${Date.now()}.json`);
        await mkdir(dirname(archivePath), { recursive: true });
        await rm(artifactPath, { force: true });
        await rm(recordPath, { force: true });

        // Append to ledger
        await this.appendLedger({
            id: `rollback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'rollback',
            strategyId,
            artifactVersion: previousRecord.artifact.version,
            timestamp: new Date().toISOString(),
            actor: options.actor,
            reason: options.reason,
            previousState: JSON.stringify({ strategyId, version: previousRecord.artifact.version, flagKey: previousRecord.flagKey }),
        });

        console.log(`🔄 Rolled back ${strategyId} (disabled flag: ${previousRecord.flagKey})`);
        return true;
    }

    /**
     * Enable/disable a strategy via feature flag
     */
    async setFlag(flagKey: string, enabled: boolean): Promise<void> {
        const flagPath = join(this.config.flagsDir, `${flagKey}.json`);
        await mkdir(dirname(flagPath), { recursive: true });
        
        const flag = {
            key: flagKey,
            enabled,
            updatedAt: new Date().toISOString(),
        };
        await writeFile(flagPath, JSON.stringify(flag, null, 2));
    }

    /**
     * Get feature flag state
     */
    async getFlag(flagKey: string): Promise<{ enabled: boolean; updatedAt: string } | null> {
        const flagPath = join(this.config.flagsDir, `${flagKey}.json`);
        try {
            const content = await readFile(flagPath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    /**
     * Get all adopted strategies
     */
    async getAdoptedStrategies(): Promise<AdoptionRecord[]> {
        try {
            const files = await readdir(this.config.strategiesDir);
            const adoptionFiles = files.filter(f => f.endsWith('.adoption.json'));
            const records = await Promise.all(
                adoptionFiles.map(async f => {
                    const content = await readFile(join(this.config.strategiesDir, f), 'utf-8');
                    return JSON.parse(content);
                })
            );
            return records;
        } catch {
            return [];
        }
    }

    /**
     * Get adoption ledger
     */
    getLedger(): LedgerEntry[] {
        return this.ledger;
    }

    /**
     * Generate semantic version from candidate
     */
    private generateVersion(candidate: CandidateStrategy): string {
        // Use timestamp-based versioning for uniqueness
        const date = new Date();
        const major = date.getFullYear() - 2024;
        const minor = date.getMonth() + 1;
        const patch = date.getDate();
        const build = Math.floor(date.getTime() / 1000) % 10000;
        return `${major}.${minor}.${patch}-${build}`;
    }

    /**
     * Check if a strategy is currently enabled
     */
    async isEnabled(strategyId: string): Promise<boolean> {
        const recordPath = join(this.config.strategiesDir, `${strategyId}.adoption.json`);
        try {
            const record = JSON.parse(await readFile(recordPath, 'utf-8'));
            const flag = await this.getFlag(record.flagKey);
            return flag?.enabled ?? false;
        } catch {
            return false;
        }
    }
}

/**
 * Create adoption system with default config
 */
export function createAdoptionSystem(config?: Partial<AdoptionConfig>): StrategyAdoption {
    return new StrategyAdoption(config);
}

/**
 * Adopt the winning candidate from an evaluation report
 */
export async function adoptWinner(
    evaluationReport: EvaluationReport,
    candidatesDir: CandidateDir,
    options: { actor: string; reason: string; enabled?: boolean } = { actor: 'system', reason: 'Evaluation winner' }
): Promise<StrategyArtifact | null> {
    const adoption = createAdoptionSystem();
    
    // Find winning candidate (highest success rate that beats baseline)
    const winners = evaluationReport.candidates
        .filter(c => c.passed)
        .sort((a, b) => b.overallSuccessRate - a.overallSuccessRate);
    
    if (winners.length === 0) {
        console.log('❌ No candidates beat baseline');
        return null;
    }
    
    const winner = winners[0];
    const candidate = candidatesDir.candidates.get(winner.candidateId);
    
    if (!candidate) {
        console.log(`❌ Winner candidate ${winner.candidateId} not found`);
        return null;
    }
    
    return adoption.adopt(candidate, winner, options);
}