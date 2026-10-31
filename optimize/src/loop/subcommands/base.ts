/**
 * Base class for loop subcommands - eliminates duplication across CLI subcommands
 */

import { loadLoopConfig, validateLoopConfig } from '../../utils/loopConfig.js';
import { getArtifactPaths, ensureDir, readJsonArtifact, writeJsonArtifact, writeJsonlArtifact } from '../artifactIO.js';

export interface SubcommandConfig {
    version: string;
    discovery?: {
        sourceDirs?: string[];
        excludePatterns?: string[];
    };
}

export interface SubcommandOptions {
    outputDir: string;
    dry: boolean;
    json: boolean;
}

export interface SubcommandResult {
    exitCode: number;
    outputDir: string;
    artifacts?: string[];
}

export abstract class BaseSubcommand {
    protected config: SubcommandConfig;
    protected options: SubcommandOptions;
    protected paths: ReturnType<typeof getArtifactPaths>;

    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        this.config = config;
        this.options = options;
        this.paths = getArtifactPaths(options.outputDir);
    }

    async run(): Promise<number> {
        try {
            if (!this.options.dry) {
                await ensureDir(this.options.outputDir);
            }
            return await this.execute();
        } catch (error) {
            console.error(`❌ ${this.getName()} failed: ${error instanceof Error ? error.message : String(error)}`);
            return 1;
        }
    }

    protected abstract execute(): Promise<number>;
    protected abstract getName(): string;

    protected logStep(step: string): void {
        console.log(`\n━━━ ${step} ━━━`);
    }

    protected logInfo(message: string): void {
        console.log(`  ${message}`);
    }

    protected logSuccess(message: string): void {
        console.log(`  ✅ ${message}`);
    }

    protected logWarning(message: string): void {
        console.log(`  ⚠️  ${message}`);
    }

    protected logError(message: string): void {
        console.log(`  ❌ ${message}`);
    }

    protected async loadArtifact<T>(path: string): Promise<T | null> {
        return readJsonArtifact<T>(path);
    }

    protected async saveArtifact(path: string, data: unknown): Promise<void> {
        if (!this.options.dry) {
            await writeJsonArtifact(path, data, this.options.dry);
        }
    }

    protected async saveJsonlArtifact(path: string, lines: string[]): Promise<void> {
        if (!this.options.dry) {
            await writeJsonlArtifact(path, lines, this.options.dry);
        }
    }

    protected printDryRun(data?: unknown): void {
        if (this.options.dry) {
            console.log('\n🔍 Dry run - no files written');
            if (this.options.json && data) console.log(JSON.stringify(data, null, 2));
        }
    }

    protected printArtifacts(artifacts: string[]): void {
        if (!this.options.dry) {
            console.log(`\n✅ Artifacts written to ${this.options.outputDir}/`);
            for (const artifact of artifacts) {
                console.log(`   - ${artifact}`);
            }
        }
    }
}

export async function loadConfig(configPath: string): Promise<SubcommandConfig> {
    const config = await loadLoopConfig(configPath);
    await validateLoopConfig(config);
    return config;
}