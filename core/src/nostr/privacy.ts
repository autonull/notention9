import { Property, PrivacyLevel } from '../types/index.js';

/**
 * Hash a string value using SHA-256
 */
export async function hashValue(value: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(value);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
        throw new Error('Crypto API not available');
    }
}

/**
 * Generate Nostr tags based on privacy level
 */
export async function getPrivacyTags(properties: Property[], level: PrivacyLevel): Promise<string[][]> {
    if (level === 'public') {
        return properties.flatMap(p => p.values.map(v => ['property', p.key, p.operator, v]));
    }

    const tags: string[][] = [];

    for (const p of properties) {
        const valueTags = await Promise.all(p.values.map(async (v) => {
            if (level === 'protected') {
                // Level 1: Protected - [property-hash, key, hash(value)]
                // Reveals the Key (Ontology), hides the Value.
                const hashedVal = await hashValue(v);
                return ['property-hash', p.key, hashedVal];
            } else if (level === 'private') {
                // Level 2: Secret - [property-secret, hash(key:value)]
                // Hides both Key and Value. Only exact matches can identify this.
                const secretPayload = `${p.key}:${v}`;
                const hashedSecret = await hashValue(secretPayload);
                return ['property-secret', hashedSecret];
            }
            return null;
        }));

        valueTags.forEach(tag => {
            if (tag) tags.push(tag);
        });
    }

    return tags;
}
