export type PresentationMode = 'silent' | 'suggest' | 'clarify' | 'block';

export interface PresentationOptions {
    confidence: number;
    risk: 'low' | 'high';
}

export function resolvePresentation(options: PresentationOptions): PresentationMode {
    const { confidence, risk } = options;

    if (confidence >= 0.85) {
        return risk === 'high' ? 'clarify' : 'suggest';
    }

    if (confidence >= 0.6) {
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