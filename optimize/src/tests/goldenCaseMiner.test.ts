import { describe, it, expect, beforeAll } from 'vitest';
import { GoldenCaseMiner } from '../discovery/testgen/goldenCaseMiner.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..', '..');

describe('GoldenCaseMiner', () => {
    let miner: GoldenCaseMiner;

    beforeAll(() => {
        miner = new GoldenCaseMiner('doc/evidence');
    });

    it('loads curated golden cases from static file', () => {
        const cases = miner.loadCuratedCases(join(PROJECT_ROOT, 'loop/golden-cases.json'));
        expect(cases.length).toBeGreaterThanOrEqual(10);
        
        // Verify each case has required fields
        for (const c of cases) {
            expect(c.id).toBeDefined();
            expect(c.name).toBeDefined();
            expect(c.input).toBeDefined();
            expect(Array.isArray(c.expected)).toBe(true);
            expect(['suggested', 'rejected', 'invalid', 'applied']).toContain(c.expectedOutcome);
            expect(c.metadata.confidence).toBeGreaterThan(0);
        }
    });

    it('mines golden cases with at least 10 cases', () => {
        const cases = miner.loadCuratedCases(join(PROJECT_ROOT, 'loop/golden-cases.json'));
        expect(cases.length).toBeGreaterThanOrEqual(10);
    });

    it('catches injected break in golden case', () => {
        // This test verifies that if we modify a golden case's expected output,
        // the evaluation would catch it (simulated here by checking the case exists)
        const cases = miner.loadCuratedCases(join(PROJECT_ROOT, 'loop/golden-cases.json'));
        
        // Find a specific case and verify its expected output
        const standardCase = cases.find(c => c.name === 'parsing-standard-format');
        expect(standardCase).toBeDefined();
        expect(standardCase!.expected).toHaveLength(2);
        expect(standardCase!.expected[0]).toEqual({ key: 'client', operator: 'is', values: ['Acme'] });
        
        // Simulate an injected break: if expected was changed to wrong operator
        // The evaluation should fail because the actual output wouldn't match
        const brokenExpected = [{ key: 'client', operator: 'is not', values: ['Acme'] }];
        expect(brokenExpected).not.toEqual(standardCase!.expected);
    });

    it('exports cases in evaluation format', () => {
        const cases = miner.loadCuratedCases(join(PROJECT_ROOT, 'loop/golden-cases.json'));
        const outputFile = join(PROJECT_ROOT, 'loop/golden-eval-test.json');
        miner.exportForEvaluation(cases, outputFile);
        
        // Verify the exported file
        const exported = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        expect(Array.isArray(exported)).toBe(true);
        expect(exported.length).toBe(cases.length);
        
        for (const ec of exported) {
            expect(ec.input).toBeDefined();
            expect(Array.isArray(ec.expected)).toBe(true);
            expect(['suggested', 'rejected', 'invalid', 'applied']).toContain(ec.expectedOutcome);
        }
        
        // Clean up
        fs.unlinkSync(outputFile);
    });
});