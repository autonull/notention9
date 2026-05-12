import { SimplePool, finalizeEvent, Filter } from 'nostr-tools';
import type { NostrEvent, Note, Property, PrivacyLevel } from './types/index.js';
import { NetworkGate, PrivacyError } from './networkGate.js';
import { getPrivacyTags } from './nostr/privacy.js';
import { hexToBytes } from './utils/encoding.js';
import { Logger } from './utils/logging.js';
import { DEFAULT_RELAYS, resolveRelays } from './config/nostr.js';
import { queryEventsWithTimeout } from './utils/nostrQuery.js';

export { DEFAULT_RELAYS, resolveRelays };
export const KIND_TEXT_NOTE = 1;
export const KIND_SEMANTIC_NOTE = 35000;

interface NIP07Window extends Window {
  nostr?: {
    getPublicKey: () => Promise<string>;
    signEvent: (event: {
      kind: number;
      tags: string[][];
      content: string;
      created_at: number;
    }) => Promise<NostrEvent>;
  };
}

export const pool = new SimplePool();

/**
 * Helper to query events using subscribeMany since SimplePool in v2 might lack list/query.
 * Aggregates events until EOSE or timeout.
 */
export const queryEvents = queryEventsWithTimeout;

export const formatNpub = (npub: string) =>
  `${npub.slice(0, 10)}...${npub.slice(-4)}`;

export const extractPropertiesFromTags = (tags: string[][]): Property[] => {
    const propsMap = new Map<string, Property>();

    tags.filter(t => t[0] === 'property').forEach(([, key, op, val]) => {
        const existing = propsMap.get(key);
        if (existing) {
            existing.values.push(val);
        } else {
            propsMap.set(key, { key, operator: op, values: [val] });
        }
    });
    return Array.from(propsMap.values());
};

// Deprecated alias for backward compatibility (if needed internally), but prefer extractPropertiesFromTags
export const parsePropertiesFromTags = extractPropertiesFromTags;

export const convertEventToNote = (event: NostrEvent): Note => {
  const timestamp = new Date(event.created_at * 1000).toISOString();
  return {
    id: event.id,
    title: '',
    content: event.content,
    tags: event.tags.filter(t => t[0] === 't').map(t => t[1]),
    publishedAt: timestamp,
    properties: extractPropertiesFromTags(event.tags),
    createdAt: timestamp,
    updatedAt: timestamp,
    nostrEventId: event.id,
    source: {
      type: 'import',
      identifier: 'nostr-import',
      timestamp: Date.now()
    },
    privacy: 'public',
    priority: 0.5,
    author: event.pubkey,
  };
};

const networkGate = new NetworkGate();

export interface NostrSigner {
    signEvent(event: { kind: number; tags: string[][]; content: string; created_at: number }): Promise<NostrEvent>;
}

export class BrowserSigner implements NostrSigner {
    async signEvent(event: { kind: number; tags: string[][]; content: string; created_at: number }): Promise<NostrEvent> {
        const hasWindow = typeof window !== 'undefined';
        const nostrWindow = hasWindow ? (window as unknown as NIP07Window) : undefined;

        if (!nostrWindow?.nostr?.signEvent) {
            throw new Error('NIP-07 extension not available');
        }
        return await nostrWindow.nostr.signEvent(event);
    }
}

export class NodeSigner implements NostrSigner {
    constructor(private privkeyHex: string) {
        if (!privkeyHex) {
            throw new Error('Private key must be provided for NodeSigner');
        }
    }

    async signEvent(event: { kind: number; tags: string[][]; content: string; created_at: number }): Promise<NostrEvent> {
        const sk = hexToBytes(this.privkeyHex);
        return finalizeEvent(event, sk);
    }
}

export class DefaultSignerFactory {
    static getSigner(privkeyHex?: string): NostrSigner {
        const hasWindow = typeof window !== 'undefined';
        const nostrWindow = hasWindow ? (window as unknown as NIP07Window) : undefined;

        if (nostrWindow?.nostr?.signEvent) {
            return new BrowserSigner();
        }
        if (privkeyHex) {
            return new NodeSigner(privkeyHex);
        }
        throw new Error('No private key provided and NIP-07 extension not available');
    }
}

export async function publishNoteToNostr(
  note: Note,
  privkeyHex: string | undefined,
  relays: string[] = DEFAULT_RELAYS,
  promptUserCallback?: (msg: string) => Promise<boolean>,
  privacyMode: PrivacyLevel = 'public',
  signer?: NostrSigner
): Promise<void> {
  const canPublish = await networkGate.canTransmit(
    note,
    'Nostr network',
    promptUserCallback
  );

  if (!canPublish) {
    throw new PrivacyError('Publication cancelled - note is private');
  }

  const activeSigner = signer ?? DefaultSignerFactory.getSigner(privkeyHex);
  const signedEvent = await prepareAndSignEvent(note, activeSigner, privacyMode);

  // Publish
  const pubs = pool.publish(relays, signedEvent);

  try {
    await Promise.any(pubs);
  } catch (e: any) {
    Logger.getInstance().warn('Failed to publish to any relay', e);
    throw e;
  }

  note.nostrEventId = signedEvent.id;
  note.publishedAt = new Date().toISOString();
}

async function prepareAndSignEvent(
    note: Note,
    signer: NostrSigner,
    privacyMode: PrivacyLevel
): Promise<NostrEvent> {
    const payload = await prepareEventPayload(note, privacyMode);
    return signer.signEvent(payload);
}

async function prepareEventPayload(note: Note, privacyMode: PrivacyLevel) {
    // Calculate privacy tags
    const propertyTags = await getPrivacyTags(note.properties, privacyMode);

    const propertyIndexTags = privacyMode === 'private'
        ? []
        : note.properties.flatMap(p => {
             const keyTags = [['t', `prop:${p.key}`]];
             // For public notes, also index numeric values if possible for server-side range filters in future
             return keyTags;
        });

    const tags: string[][] = [
        ['d', note.id],
        ...note.tags.map(t => ['t', t]),
        ...propertyIndexTags,
        ...propertyTags
    ];

    // Add unique t-tags
    const seenT = new Set<string>();
    const uniqueTags = tags.filter(tag => {
        if (tag[0] === 't') {
            if (seenT.has(tag[1])) return false;
            seenT.add(tag[1]);
        }
        return true;
    });

    const created_at = Math.floor(Date.now() / 1000);
    const kind = note.properties.length > 0 ? KIND_SEMANTIC_NOTE : KIND_TEXT_NOTE;
    const content = note.content;

    return { tags: uniqueTags, kind, created_at, content };
}
