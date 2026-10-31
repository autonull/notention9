import type { Property } from '../types/index.js';

export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'range' | 'partial' | 'substring' | 'none' | 'geo' | 'date' | 'unknown';

export interface MatchDetails {
    type: MatchType;
    aliasUsed?: string;
    valueMatch?: string;
}

export interface PropertyMatch {
    requestProp: Property;
    offerProp: Property;
    compatibility: number;
    reason: string;
    details?: MatchDetails;
}

export interface MatchResult {
    score: number;
    matches: PropertyMatch[];
    conflicts: PropertyMatch[];
    missing: Property[];
}

export type { Property };