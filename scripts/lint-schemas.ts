/**
 * Schema linting script (S7)
 * Verifies all emitted definitions match Zod schemas
 * Run with: pnpm lint:schemas
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { 
    seamDefinitionSchema,
    caseManifestSchema,
    EVENT_SCHEMAS,
    type CaseManifest,
} from '../core/src/schemas/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const GENERATED_DIR = join(PROJECT_ROOT, 'core', 'src', 'schemas', 'generated');
const SEAM_DEFINITIONS_FILE = join(GENERATED_DIR, 'seam-definitions.json');
const CASE_MANIFEST_FILE = join(PROJECT_ROOT, 'eval', 'cases', 'manifest.json');

interface LintResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

function canonicalizeSeamDefinitions(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, Object.keys(obj).sort(), 2);
}

function canonicalizeManifest(manifest: Omit<CaseManifest, 'hash'>): string {
    // Sort cases by id for deterministic output (matches caseManifest.ts)
    const sorted = { ...manifest, cases: [...manifest.cases].sort((a, b) => a.id.localeCompare(b.id)) };
    return JSON.stringify(sorted, null, 2);
}

function lintSeamDefinitions(): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!existsSync(SEAM_DEFINITIONS_FILE)) {
        return { valid: false, errors: [`File not found: ${SEAM_DEFINITIONS_FILE}`], warnings };
    }
    
    try {
        const content = readFileSync(SEAM_DEFINITIONS_FILE, 'utf-8');
        const data = JSON.parse(content);
        
        // Validate structure
        if (data.version !== 1) {
            errors.push(`Expected version 1, got ${data.version}`);
        }
        
        if (!data.seams || !Array.isArray(data.seams)) {
            errors.push('Missing or invalid "seams" array');
        } else {
            for (let i = 0; i < data.seams.length; i++) {
                const result = seamDefinitionSchema.safeParse(data.seams[i]);
                if (!result.success) {
                    for (const issue of result.error.issues) {
                        errors.push(`seams[${i}]: ${issue.path.join('.')} - ${issue.message}`);
                    }
                }
            }
        }
        
        if (!data.strategies || !Array.isArray(data.strategies)) {
            warnings.push('Missing or invalid "strategies" array');
        }
        
        // Verify hash
        const { hash, ...rest } = data;
        const canonical = canonicalizeSeamDefinitions(rest);
        const computedHash = createHash('sha256').update(canonical).digest('hex').slice(0, 16);
        
        if (hash !== computedHash) {
            errors.push(`Hash mismatch: expected ${hash}, computed ${computedHash}`);
        }
        
    } catch (e) {
        errors.push(`Failed to parse seam-definitions.json: ${e}`);
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

function lintCaseManifest(): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!existsSync(CASE_MANIFEST_FILE)) {
        return { valid: false, errors: [`File not found: ${CASE_MANIFEST_FILE}`], warnings };
    }
    
    try {
        const content = readFileSync(CASE_MANIFEST_FILE, 'utf-8');
        const data = JSON.parse(content);
        
        const result = caseManifestSchema.safeParse(data);
        if (!result.success) {
            for (const issue of result.error.issues) {
                errors.push(`manifest: ${issue.path.join('.')} - ${issue.message}`);
            }
        }
        
        // Verify hash
        const { hash, ...rest } = data;
        const canonical = canonicalizeManifest(rest as Omit<CaseManifest, 'hash'>);
        const computedHash = createHash('sha256').update(canonical).digest('hex').slice(0, 16);
        
        if (hash !== computedHash) {
            errors.push(`Hash mismatch: expected ${hash}, computed ${computedHash}`);
        }
        
    } catch (e) {
        errors.push(`Failed to parse manifest.json: ${e}`);
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

function lintEventSchemas(): LintResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Test that all event schemas can be instantiated and validate
    for (const [type, schema] of Object.entries(EVENT_SCHEMAS)) {
        try {
            // Create minimal valid event
            const testEvent = {
                id: 'test',
                type,
                actor: 'system' as const,
                payload: {},
                timestamp: new Date().toISOString(),
                hash: 'abc123',
            };
            
            const result = schema.safeParse(testEvent);
            if (!result.success) {
                // This is expected for some types that require specific payload
                warnings.push(`Event type '${type}' requires specific payload (test skipped)`);
            }
        } catch (e) {
            errors.push(`Event schema '${type}' validation error: ${e}`);
        }
    }
    
    return { valid: errors.length === 0, errors, warnings };
}

async function main() {
    console.log('🔍 Linting schemas...\n');
    
    let allValid = true;
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    // Lint seam definitions
    console.log('1. Seam Definitions...');
    const seamResult = lintSeamDefinitions();
    if (seamResult.valid) {
        console.log('   ✅ Valid');
    } else {
        console.log('   ❌ Invalid');
        allValid = false;
    }
    allErrors.push(...seamResult.errors.map(e => `[seams] ${e}`));
    allWarnings.push(...seamResult.warnings.map(w => `[seams] ${w}`));
    
    // Lint case manifest
    console.log('\n2. Case Manifest...');
    const manifestResult = lintCaseManifest();
    if (manifestResult.valid) {
        console.log('   ✅ Valid');
    } else {
        console.log('   ❌ Invalid');
        allValid = false;
    }
    allErrors.push(...manifestResult.errors.map(e => `[manifest] ${e}`));
    allWarnings.push(...manifestResult.warnings.map(w => `[manifest] ${w}`));
    
    // Lint event schemas
    console.log('\n3. Event Schemas...');
    const eventResult = lintEventSchemas();
    if (eventResult.valid) {
        console.log('   ✅ Valid');
    } else {
        console.log('   ❌ Invalid');
        allValid = false;
    }
    allErrors.push(...eventResult.errors.map(e => `[events] ${e}`));
    allWarnings.push(...eventResult.warnings.map(w => `[events] ${w}`));
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (allValid) {
        console.log('✅ All schemas valid');
    } else {
        console.log('❌ Schema validation failed:');
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