import { describe, it, expect } from 'vitest';
import { PropertyExtractor } from '../notes/propertyExtractor/PropertyExtractor.js';
import { DEFAULT_ONTOLOGY } from '../ontology/domains.js';

/**
 * The E2 capture experiment scores a capture by the request slots it carries.
 * These prompts are the validation-set cases the experiment replays.
 *
 * `intent-capture-011` is excluded: its contract asks for a `deadline` but the
 * prompt carries no temporal cue, so no text-only extractor can satisfy it.
 * It fails identically in both arms and therefore does not bias the A/B.
 */
const CAPTURE_CASES: Array<{ prompt: string; requiredKeys: string[] }> = [
    { prompt: 'My elderly father needs grab bars installed in the bathroom by end of month', requiredKeys: ['need', 'deadline'] },
    { prompt: 'Need a babysitter for Friday night 6-10pm, CPR certified, paying 18/hr', requiredKeys: ['need', 'schedule', 'budget'] },
    { prompt: 'Looking for photographer for family portraits next Sunday outdoor, budget 200', requiredKeys: ['need', 'schedule', 'budget'] },
    { prompt: 'Need driving instructor for teenager, patient, automatic car, budget 50/hr', requiredKeys: ['need', 'budget'] },
    { prompt: 'Need smart home setup for lights thermostat locks, budget 150', requiredKeys: ['need', 'budget'] },
    { prompt: 'Need math tutor for high school student, Tuesdays and Thursdays 4-6pm, free at community center', requiredKeys: ['need', 'schedule', 'price'] },
    { prompt: 'Need lactation consultant for newborn, virtual sessions preferred, insurance or budget 75/session', requiredKeys: ['need', 'budget'] },
    { prompt: 'Need house cleaner biweekly deep clean 3 bed 2 bath budget 120 per visit', requiredKeys: ['need', 'frequency', 'budget'] },
];

describe('request slot extraction', () => {
    const extractor = new PropertyExtractor(DEFAULT_ONTOLOGY);

    it.each(CAPTURE_CASES)('captures required slots: $requiredKeys', async ({ prompt, requiredKeys }) => {
        const properties = await extractor.extractFromText(prompt);
        const keys = properties.map(p => p.key);
        expect(keys).toEqual(expect.arrayContaining(requiredKeys));
    });

    it('does not read a time range as a price', async () => {
        const properties = await extractor.extractFromText('Need math tutor, Tuesdays and Thursdays 4-6pm');
        expect(properties.find(p => p.key === 'price')).toBeUndefined();
    });

    it('reads a currency range as a price', async () => {
        const properties = await extractor.extractFromText('Photographer for portraits between $200 and $400');
        const price = properties.find(p => p.key === 'price');
        expect(price?.operator).toBe('between');
    });

    it('captures the deadline of a period-bounded request', async () => {
        const properties = await extractor.extractFromText('Grab bars installed by end of month');
        expect(properties.find(p => p.key === 'deadline')?.values[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('captures a weekday deadline', async () => {
        const properties = await extractor.extractFromText('Wheelchair ramp installed before Friday');
        expect(properties.find(p => p.key === 'deadline')?.values[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('keeps the need phrase free of qualifiers', async () => {
        const properties = await extractor.extractFromText('Need a babysitter for Friday night 6-10pm');
        expect(properties.find(p => p.key === 'need')?.values[0]).toBe('babysitter');
    });

    it('leaves a request without a temporal cue without a deadline', async () => {
        const properties = await extractor.extractFromText('Need to organize a meal train for the new parents on Maple Street');
        expect(properties.find(p => p.key === 'need')).toBeDefined();
        expect(properties.find(p => p.key === 'deadline')).toBeUndefined();
    });
});
