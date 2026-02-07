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
    const tags: string[][] = [];

    // Level 0: Public
    // [property, key, operator, value]
    if (level === 'public') {
        return properties.flatMap(p => p.values.map(v => ['property', p.key, p.operator, v]));
    }

    for (const p of properties) {
        for (const v of p.values) {

            // Level 1: Protected
            // [property-hash, key, hash(value)]
            // Reveals the Key (Ontology), hides the Value.
            if (level === 'protected') {
                const hashedVal = await hashValue(v);
                tags.push(['property-hash', p.key, hashedVal]);
            }

            // Level 2: Secret
            // [property-secret, hash(key:value)]
            // Hides both Key and Value. Only exact matches can identify this.
            else if (level === 'private') {
                const secretPayload = `${p.key}:${v}`;
                const hashedSecret = await hashValue(secretPayload);
                tags.push(['property-secret', hashedSecret]);
            }
        }
    }
    return tags;
}
