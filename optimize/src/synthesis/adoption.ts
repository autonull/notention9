import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CandidateStrategy, CandidateDir, StrategyArtifact } from './StrategySpec.js';
import type { EvaluationReport } from './evaluator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Strategy adoption system - handles versioning, feature flags, rollback, and provenance
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
    evaluation: EvaluationReport['candidates'][0];
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
        this.config = {
            strategiesDir: config.strategiesDir || 'adopted-strategies',
            flagsDir: config.flagsDir || 'feature-flags',
            ledgerFile: config.ledgerFile || 'adoption-ledger.jsonl',
            defaultEnabled: config.defaultEnabled ?? false,
        };
        this.loadLedger();
    }

    private loadLedger(): void {
        if (existsSync(this.config.ledgerFile)) {
            const content = readFileSync(this.config.ledgerFile, 'utf-8');
            this.ledger = content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
        }
    }

    private appendLedger(entry: LedgerEntry): void {
        this.ledger.push(entry);
        mkdirSync(dirname(this.config.ledgerFile), { recursive: true });
        writeFileSync(this.config.ledgerFile, this.ledger.map(e => JSON.stringify(e)).join('\n') + '\n', { flag: 'a' });
    }

    /**
     * Adopt a winning candidate strategy
     */
    async adopt(
        candidate: CandidateStrategy,
        evaluation: EvaluationReport['candidates'][0],
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
                evidenceBundle: evaluation ? 'evaluation-report.json' : undefined,
            },
        };
        
        // Save artifact
        const artifactPath = join(this.config.strategiesDir, `${candidate.id}.json`);
        mkdirSync(dirname(artifactPath), { recursive: true });
        writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

        // Create feature flag
        const flagKey = `strategy-${candidate.id}`;
        await this.setFlag(flagKey, options.enabled ?? this.config.defaultEnabled);

        // Record adoption
        const record: AdoptionRecord = {
            strategyId: candidate.id,
            artifact,
            evaluation: {
                candidateId: evaluation.candidateId,
                overallSuccessRate: evaluation.overallSuccessRate,
                passed: evaluation.passed,
                resourceMetrics: evaluation.resourceMetrics,
            },
            adoptedAt: new Date().toISOString(),
            adoptedBy: options.actor,
            flagKey,
            enabled: options.enabled ?? this.config.defaultEnabled,
            provenance: artifact.provenance,
        };

        const recordPath = join(this.config.strategiesDir, `${candidate.id}.adoption.json`);
        writeFileSync(recordPath, JSON.stringify(record, null, 2));

        // Append to ledger
        this.appendLedger({
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

        if (!existsSync(artifactPath) || !existsSync(recordPath)) {
            console.log(`❌ Strategy ${strategyId} not found for rollback`);
            return false;
        }

        const previousRecord = JSON.parse(readFileSync(recordPath, 'utf-8'));

        // Disable feature flag
        await this.setFlag(previousRecord.flagKey, false);

        // Move artifact to archive
        const archivePath = join(this.config.strategiesDir, 'archive', `${strategyId}-${Date.now()}.json`);
        mkdirSync(dirname(archivePath), { recursive: true });
        rmSync(artifactPath, { force: true });
        rmSync(recordPath, { force: true });

        // Append to ledger
        this.appendLedger({
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
        mkdirSync(dirname(flagPath), { recursive: true });
        
        const flag = {
            key: flagKey,
            enabled,
            updatedAt: new Date().toISOString(),
        };
        writeFileSync(flagPath, JSON.stringify(flag, null, 2));
    }

    /**
     * Get feature flag state
     */
    getFlag(flagKey: string): { enabled: boolean; updatedAt: string } | null {
        const flagPath = join(this.config.flagsDir, `${flagKey}.json`);
        if (!existsSync(flagPath)) return null;
        
        const content = readFileSync(flagPath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Get all adopted strategies
     */
    getAdoptedStrategies(): AdoptionRecord[] {
        if (!existsSync(this.config.strategiesDir)) return [];
        
        const files = readdirSync(this.config.strategiesDir).filter(f => f.endsWith('.adoption.json'));
        return files.map(f => {
            const content = readFileSync(join(this.config.strategiesDir, f), 'utf-8');
            return JSON.parse(content);
        });
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
    isEnabled(strategyId: string): boolean {
        const recordPath = join(this.config.strategiesDir, `${strategyId}.adoption.json`);
        if (!existsSync(recordPath)) return false;
        
        const record = JSON.parse(readFileSync(recordPath, 'utf-8'));
        return this.getFlag(record.flagKey)?.enabled ?? false;
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