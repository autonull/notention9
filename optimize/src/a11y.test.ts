import { describe, expect, it } from 'vitest';
import { generateA11yFindingsFromBundle } from './a11y.js';

const bundle = (content: string, operator: string) => ({
    journeyId: 'palette-test',
    steps: [{
        kind: 'capture',
        stateSnapshot: {
            note: {
                content,
                properties: [{ key: 'framework', operator, values: ['Next.js'] }],
            },
        },
    }],
});

describe('generateA11yFindingsFromBundle', () => {
    it('ignores a matching rendered operator', () => {
        const findings = generateA11yFindingsFromBundle(
            bundle('<span data-name="framework" data-operator="is" data-value="Next.js"></span>', 'is')
        );
        expect(findings).toEqual([]);
    });

    it('flags a rendered operator that differs from the stored one', () => {
        const findings = generateA11yFindingsFromBundle(
            bundle('<span data-name="framework" data-operator="contains" data-value="Next.js"></span>', 'is')
        );
        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({
            id: 'a11y-palette-test-framework-operator-mismatch',
            location: 'note.properties.framework',
            severity: 'major',
        });
        expect(findings[0].title).toContain('contains');
        expect(findings[0].title).toContain('is');
    });

    it('ignores captures without note content', () => {
        const findings = generateA11yFindingsFromBundle({
            journeyId: 'palette-test',
            steps: [{ kind: 'capture', stateSnapshot: { note: { properties: [{ key: 'framework', operator: 'is', values: ['Next.js'] }] } } }],
        });
        expect(findings).toEqual([]);
    });
});
