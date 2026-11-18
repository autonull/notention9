import { Property, PrivacyLevel } from '../../types/index.js';

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
 * Generate Nostr tags for a note.
 * Public notes expose key/operator/value. Private notes never leave the device,
 * but if a caller transmits one it only gets a hash of `key:value`.
 */
export async function getPrivacyTags(properties: Property[], level: PrivacyLevel): Promise<string[][]> {
    if (level === 'public') {
        return properties.flatMap(p => p.values.map(v => ['property', p.key, p.operator, v]));
    }

    const tags: string[][] = [];

    for (const p of properties) {
        const valueTags = await Promise.all(p.values.map(async (v) => {
            const secretPayload = `${p.key}:${v}`;
            const hashedSecret = await hashValue(secretPayload);
            return ['property-secret', hashedSecret];
        }));

        for (const tag of valueTags) tags.push(tag);
    }

    return tags;
}
