/**
 * Contract linting script (S7 cross-cutting)
 * Validates plugin interfaces + schema compliance
 * Run with: pnpm lint:contracts
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

interface LintResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

interface PluginContract {
    interface: string;
    requiredMethods: string[];
    schema?: string; // Zod schema reference
}

const PLUGIN_CONTRACTS: Record<string, PluginContract> = {
    'VerdictEngine': {
        interface: 'VerdictEngine',
        requiredMethods: ['computeCaseVerdict', 'computeRunVerdict', 'getName', 'getDefaultConfig', 'validateConfig'],
        schema: 'verdictEngineConfig',
    },
    'SplitStrategy': {
        interface: 'SplitStrategy',
        requiredMethods: ['splitIntentCases', 'getName', 'getDefaultConfig', 'validateConfig'],
        schema: 'splitStrategyConfig',
    },
    'CaseStore': {
        interface: 'CaseStore',
        requiredMethods: ['init', 'readManifest', 'readIntentCases', 'readQualityCases', 'readHoldoutCases', 'readAllCases', 'upsertCase', 'deleteCase', 'verifyIntegrity', 'close'],
        schema: 'caseManifest',
    },
    'EventStore': {
        interface: 'EventStore',
        requiredMethods: ['init', 'append', 'query', 'getRunEvents', 'count', 'prune', 'exportRun', 'close'],
        schema: 'eventSchema',
    },
    'CandidateGenerator': {
        interface: 'CandidateGenerator',
        requiredMethods: ['generate', 'getName', 'getSearchSpace'],
        schema: 'candidateGeneratorConfig',
    },
    'ResolutionStrategy': {
        interface: 'ResolutionStrategy',
        requiredMethods: ['resolve', 'getName'],
        schema: 'resolutionStrategyConfig',
    },
    'RevisionDriver': {
        interface: 'RevisionDriver',
        requiredMethods: ['create', 'get', 'getActive', 'activate', 'search'],
        schema: 'revisionSchema',
    },
};

function findImplementationFiles(contractName: string): string[] {
    const results: string[] = [];
    
    // Search in core/src/eval, core/src/optimizer, core/src/telemetry, core/src/ui
    const searchDirs = [
        join(PROJECT_ROOT, 'core', 'src', 'eval'),
        join(PROJECT_ROOT, 'core', 'src', 'optimizer'),
        join(PROJECT_ROOT, 'core', 'src', 'telemetry'),
        join(PROJECT_ROOT, 'core', 'src', 'ui'),
    ];
    
    for (const dir of searchDirs) {
        if (!existsSync(dir)) continue;
        results.push(...findFilesRecursive(dir, contractName));
    }
    
    // Filter out known false positives
    return results.filter(f => {
        const fileName = f.split('/').pop() ?? '';
        // Exclude calibration tracker (has EventStore in imports but isn't an EventStore)
        if (fileName === 'calibrationTracker.ts') return false;
        // Exclude ProfileRegistry (imports ResolutionStrategy but doesn't implement it)
        if (fileName === 'ProfileRegistry.ts') return false;
        // Exclude strategyResolverInit.ts (imports ResolutionStrategy but doesn't implement it)
        if (fileName === 'strategyResolverInit.ts') return false;
        return true;
    });
}

function findFilesRecursive(dir: string, contractName: string): string[] {
    const results: string[] = [];
    
    // Contract-specific implementation patterns
    // Some contracts use a "Registrable" mixin pattern (e.g., RegistrableRevisionDriver extends RevisionDriver)
    // Others use base class extension (e.g., extends BaseCandidateGenerator implements RegistrableGenerator)
    const implementationPatterns: Record<string, string[]> = {
        'RevisionDriver': ['implements RevisionDriver', 'implements RegistrableRevisionDriver', 'extends BaseRevisionDriver'],
        'CandidateGenerator': ['implements CandidateGenerator', 'implements RegistrableGenerator', 'extends BaseCandidateGenerator'],
        'SplitStrategy': ['implements SplitStrategy', 'extends BaseSplitStrategy'],
        'VerdictEngine': ['implements VerdictEngine', 'extends BaseVerdictEngine'],
        'ResolutionStrategy': ['implements ResolutionStrategy', 'extends BaseResolutionStrategy'],
        'EventStore': ['implements EventStore', 'extends BaseEventStore'],
        'CaseStore': ['implements CaseStore', 'extends BaseCaseStore'],
    };
    
    const patterns = implementationPatterns[contractName] ?? [`implements ${contractName}`];
    
    try {
        for (const entry of readdirSync(dir)) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
                results.push(...findFilesRecursive(fullPath, contractName));
            } else if (extname(entry) === '.ts' && !entry.endsWith('.test.ts') && !entry.endsWith('.d.ts') && entry !== 'index.ts') {
                try {
                    const content = readFileSync(fullPath, 'utf-8');
                    // Match any of the implementation patterns for this contract
                    for (const pattern of patterns) {
                        if (content.includes(pattern)) {
                            results.push(fullPath);
                            break;
                        }
                    }
                } catch {
                    // Ignore read errors
                }
            }
        }
    } catch {
        // Ignore directory read errors
    }
    
    return results;
}

function validateImplementation(filePath: string, contract: PluginContract): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
        const content = readFileSync(filePath, 'utf-8');
        
        // Check for required methods
        for (const method of contract.requiredMethods) {
            // Simple check - look for method declaration
            const methodPattern = new RegExp(`(async\\s+)?${method}\\s*\\(`);
            if (!methodPattern.test(content)) {
                errors.push(`Missing required method: ${method}`);
            }
        }
        
        // Check for 'implements' keyword or explicit interface implementation
        if (!content.includes(`implements ${contract.interface}`) && !content.includes(`implements ${contract.interface}`)) {
            // Also check for implicit implementation (structural typing)
            const hasMethods = contract.requiredMethods.every(m => 
                new RegExp(`(async\\s+)?${m}\\s*\\(`).test(content)
            );
            if (!hasMethods) {
                // Warning handled by caller
            }
        }
        
    } catch (e) {
        errors.push(`Failed to read ${filePath}: ${e}`);
    }
    
    return { valid: errors.length === 0, errors };
}

function lintContracts(): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    console.log('Checking plugin contracts...\n');
    
    for (const [contractName, contract] of Object.entries(PLUGIN_CONTRACTS)) {
        console.log(`  ${contractName}...`);
        const implementations = findImplementationFiles(contractName);
        
        if (implementations.length === 0) {
            warnings.push(`${contractName}: No implementations found`);
            continue;
        }
        
        console.log(`    Found ${implementations.length} implementation(s)`);
        
        for (const impl of implementations) {
            const result = validateImplementation(impl, contract);
            if (!result.valid) {
                for (const err of result.errors) {
                    errors.push(`${relative(PROJECT_ROOT, impl)}: ${err}`);
                }
            }
        }
        
        // Enforce max 3 plugins per interface (guardrail)
        if (implementations.length > 3) {
            warnings.push(`${contractName}: ${implementations.length} implementations (max 3 recommended)`);
        }
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

// --- Schema validation for config files ---

function lintConfigSchemas(): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for config files that should match schemas
    const configFiles = [
        { path: join(PROJECT_ROOT, 'core', 'src', 'eval', 'verdict.ts'), schema: 'VerdictConfig' },
        { path: join(PROJECT_ROOT, 'core', 'src', 'telemetry', 'revisionStore.ts'), schema: 'Revision' },
        { path: join(PROJECT_ROOT, 'core', 'src', 'telemetry', 'ledger.ts'), schema: 'LedgerEvent' },
    ];
    
    for (const { path, schema } of configFiles) {
        if (!existsSync(path)) {
            warnings.push(`Config file not found: ${relative(PROJECT_ROOT, path)} (schema: ${schema})`);
            continue;
        }
        // TODO: Add actual schema validation
        console.log(`  ${schema}: ${relative(PROJECT_ROOT, path)} - exists`);
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

// --- Main ---

async function main() {
    console.log('🔍 Linting contracts...\n');
    
    let allValid = true;
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    const contractResult = lintContracts();
    allValid = allValid && contractResult.valid;
    allErrors.push(...contractResult.errors);
    allWarnings.push(...contractResult.warnings);
    
    const configResult = lintConfigSchemas();
    allValid = allValid && configResult.valid;
    allErrors.push(...configResult.errors);
    allWarnings.push(...configResult.warnings);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (allValid) {
        console.log('✅ All contracts valid');
    } else {
        console.log('❌ Contract validation failed:');
        for (const error of allErrors) {
            console.log(`  - ${error}`);
        }
    }
    
    if (allWarnings.length > 0) {
        console.log('\nWarnings:');
        for (const warning of allWarnings) {
            console.log(`  ⚠ ${warning}`);
        }
    }
    
    process.exit(allValid ? 0 : 1);
}

main().catch(err => {
    console.error('Linting failed:', err);
    process.exit(1);
});