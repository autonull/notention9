/**
 * Correction Flow tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CorrectionFlow, createCorrectionFromDiff, getCorrectionFlow, resetCorrectionFlow } from './correctionFlow.js';
import type { Property } from '../types/index.js';

describe('CorrectionFlow', () => {
    let flow: CorrectionFlow;

    beforeEach(() => {
        resetCorrectionFlow();
        flow = new CorrectionFlow({ minOccurrences: 2, minConfidence: 0.6 });
    });

    it('records a correction', () => {
        const correction = flow.recordCorrection({
            noteId: 'note-1',
            type: 'add',
            key: 'budget',
            operator: 'less than',
            newValues: ['900 USD'],
            source: 'user',
            confidence: 1.0,
        });

        expect(correction.id).toMatch(/^corr_/);
        expect(correction.noteId).toBe('note-1');
        expect(correction.type).toBe('add');
    });

    it('learns patterns from repeated corrections', () => {
        // Record same correction multiple times
        for (let i = 0; i < 3; i++) {
            flow.recordCorrection({
                noteId: `note-${i}`,
                type: 'add',
                key: 'deadline',
                operator: 'is',
                newValues: ['Friday'],
                source: 'user',
                confidence: 1.0,
            });
        }

        const patterns = flow.getPatterns();
        const deadlinePattern = patterns.find(p => p.property.key === 'deadline');
        
        expect(deadlinePattern).toBeDefined();
        expect(deadlinePattern!.count).toBe(3);
        expect(deadlinePattern!.confidence).toBeGreaterThan(0.5);
    });

    it('does not learn from low-confidence corrections', () => {
        flow.recordCorrection({
            noteId: 'note-1',
            type: 'add',
            key: 'budget',
            operator: 'less than',
            newValues: ['100 USD'],
            source: 'model',
            confidence: 0.5,
        });

        const patterns = flow.getPatterns();
        expect(patterns.length).toBe(0);
    });

    it('applies learned patterns to enhance extraction', () => {
        // Teach the flow a pattern
        for (let i = 0; i < 3; i++) {
            flow.recordCorrection({
                noteId: `note-${i}`,
                type: 'add',
                key: 'role',
                operator: 'contains',
                newValues: ['installer'],
                source: 'user',
                confidence: 1.0,
            });
        }

        // Manually add an example that matches the input text
        const patterns = flow.getPatterns();
        const rolePattern = patterns.find(p => p.property.key === 'role');
        if (rolePattern) {
            rolePattern.examples = ['need installer for ramp'];
        }

        const extracted: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
        ];

        const enhanced = flow.enhanceExtraction('need installer for ramp', extracted, []);
        
        const roleProp = enhanced.find(p => p.key === 'role');
        expect(roleProp).toBeDefined();
        expect(roleProp!.provenance).toBe('inferred');
        expect(roleProp!.confidence).toBeGreaterThan(0.5);
    });

    it('does not duplicate existing properties', () => {
        for (let i = 0; i < 3; i++) {
            flow.recordCorrection({
                noteId: `note-${i}`,
                type: 'add',
                key: 'budget',
                operator: 'less than',
                newValues: ['900 USD'],
                source: 'user',
                confidence: 1.0,
            });
        }

        const extracted: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'], confidence: 0.95 },
        ];

        const enhanced = flow.enhanceExtraction('need installer for ramp', extracted, []);
        
        const budgetProps = enhanced.filter(p => p.key === 'budget');
        expect(budgetProps.length).toBe(1);
    });

    it('exports and imports patterns', () => {
        for (let i = 0; i < 3; i++) {
            flow.recordCorrection({
                noteId: `note-${i}`,
                type: 'add',
                key: 'deadline',
                operator: 'is',
                newValues: ['Friday'],
                source: 'user',
                confidence: 1.0,
            });
        }

        const exported = flow.exportPatterns();
        
        const newFlow = new CorrectionFlow();
        newFlow.importPatterns(exported);

        const patterns = newFlow.getPatterns();
        expect(patterns.length).toBeGreaterThan(0);
    });

    it('computes metrics', () => {
        flow.recordCorrection({ noteId: 'n1', type: 'add', key: 'a', operator: 'is', newValues: ['1'], source: 'user', confidence: 1 });
        flow.recordCorrection({ noteId: 'n2', type: 'add', key: 'a', operator: 'is', newValues: ['1'], source: 'user', confidence: 1 });
        flow.recordCorrection({ noteId: 'n3', type: 'remove', key: 'b', operator: 'is', oldValues: ['2'], source: 'user', confidence: 1 });

        const metrics = flow.getMetrics();
        expect(metrics.totalCorrections).toBe(3);
        expect(metrics.correctionsByType.add).toBe(2);
        expect(metrics.correctionsByType.remove).toBe(1);
    });
});

describe('createCorrectionFromDiff', () => {
    it('detects added properties', () => {
        const oldProps: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
        ];
        const newProps: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
            { key: 'deadline', operator: 'is', values: ['Friday'] },
        ];

        const corrections = createCorrectionFromDiff('note-1', oldProps, newProps);
        
        expect(corrections.length).toBe(1);
        expect(corrections[0].type).toBe('add');
        expect(corrections[0].key).toBe('deadline');
    });

    it('detects edited properties', () => {
        const oldProps: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
        ];
        const newProps: Property[] = [
            { key: 'budget', operator: 'less than', values: ['800 USD'] },
        ];

        const corrections = createCorrectionFromDiff('note-1', oldProps, newProps);
        
        expect(corrections.length).toBe(1);
        expect(corrections[0].type).toBe('edit');
        expect(corrections[0].oldValues).toEqual(['900 USD']);
        expect(corrections[0].newValues).toEqual(['800 USD']);
    });

    it('detects removed properties', () => {
        const oldProps: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
            { key: 'deadline', operator: 'is', values: ['Friday'] },
        ];
        const newProps: Property[] = [
            { key: 'budget', operator: 'less than', values: ['900 USD'] },
        ];

        const corrections = createCorrectionFromDiff('note-1', oldProps, newProps);
        
        expect(corrections.length).toBe(1);
        expect(corrections[0].type).toBe('remove');
        expect(corrections[0].key).toBe('deadline');
    });
});