import type { Assertion, AsymmetricMatchersContaining } from 'vitest';

declare module 'vitest' {
    interface Assertion<T = any> {
        toBeValidNote(): T;
        toHaveNoteProperty(key: string, operator?: string, values?: string[]): T;
        toMatchJourneyStep(expectedKind: string): T;
    }
    interface AsymmetricMatchersContaining {
        toBeValidNote(): any;
        toHaveNoteProperty(key: string, operator?: string, values?: string[]): any;
        toMatchJourneyStep(expectedKind: string): any;
    }
}