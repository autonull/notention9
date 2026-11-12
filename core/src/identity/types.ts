export interface Identity {
    pubkey: string;
    npub: string;
    nsec: string;
    createdAt: number;
}

export interface EncryptedIdentity {
    ciphertext: string;
    iv: string;
    salt: string;
    version: number;
}

export interface IdentityConfig {
    passphrase?: string;
    storageKey?: string;
}

export type IdentityLockState = 'locked' | 'unlocked' | 'none';