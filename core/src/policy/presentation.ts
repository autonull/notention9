export type PresentationMode = 'silent' | 'suggest' | 'clarify' | 'block';

export interface PresentationOptions {
    confidence: number;
    risk: 'low' | 'high';
}

import {
    POLICY_HIGH_CONFIDENCE_THRESHOLD,
    POLICY_MEDIUM_CONFIDENCE_THRESHOLD,
} from '../telemetry/constants.js';

export function resolvePresentation(options: PresentationOptions): PresentationMode {
    const { confidence, risk } = options;

    if (confidence >= POLICY_HIGH_CONFIDENCE_THRESHOLD) {
        return risk === 'high' ? 'clarify' : 'suggest';
    }

    if (confidence >= POLICY_MEDIUM_CONFIDENCE_THRESHOLD) {
        return risk === 'high' ? 'block' : 'suggest';
    }

    return 'silent';
}

export function isHighRiskProperty(key: string): boolean {
    const highRiskKeys = [
        'publish',
        'delete',
        'permission',
        'privacy',
        'budget',
        'price',
        'deadline',
        'send to',
        'channel',
    ];
    return highRiskKeys.some(k => key.toLowerCase().includes(k.toLowerCase()));
}