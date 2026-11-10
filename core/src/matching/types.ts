import type { Property } from '../types/index.js';

export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'range' | 'partial' | 'substring' | 'none' | 'geo' | 'date' | 'unknown' | 'incompatible';

export interface MatchDetails {
    type: MatchType;
    aliasUsed?: string;
    valueMatch?: string;
    unit?: string;
    dimensions?: { request: string; offer: string };
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