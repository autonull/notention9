import { SimplePool, finalizeEvent, Filter } from 'nostr-tools';
import type { NostrEvent, Note, Property, PrivacyLevel } from './types/index.js';
import { NetworkGate, PrivacyError } from './networkGate.js';
import { getPrivacyTags } from './nostr/privacy.js';
import { hexToBytes } from './utils/encoding.js';
import { Logger } from './utils/logging.js';
import { DEFAULT_RELAYS } from './config/nostr.js';
import { queryEventsWithTimeout } from './utils/nostrQuery.js';

export { DEFAULT_RELAYS };
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

    for (const tag of tags) {
        if (tag[0] === 'property') {
            const [, key, op, val] = tag;
            if (propsMap.has(key)) {
                propsMap.get(key)!.values.push(val);
            } else {
                propsMap.set(key, { key, operator: op, values: [val] });
            }
        }
    }
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

export async function publishNoteToNostr(
  note: Note,
  privkeyHex: string | undefined,
  relays: string[] = DEFAULT_RELAYS,
  promptUserCallback?: (msg: string) => Promise<boolean>,
  privacyMode: PrivacyLevel = 'public'
): Promise<void> {
  const canPublish = await networkGate.canTransmit(
    note,
    'Nostr network',
    promptUserCallback
  );

  if (!canPublish) {
    throw new PrivacyError('Publication cancelled - note is private');
  }

  const signedEvent = await prepareAndSignEvent(note, privkeyHex, privacyMode);

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
    privkeyHex: string | undefined,
    privacyMode: PrivacyLevel
): Promise<NostrEvent> {
    const { tags, kind, created_at, content } = await prepareEventPayload(note, privacyMode);

    // Check for window.nostr (NIP-07)
    const hasWindow = typeof window !== 'undefined';
    const nostrWindow = hasWindow ? (window as unknown as NIP07Window) : undefined;

    if (nostrWindow?.nostr?.signEvent) {
        return await nostrWindow.nostr.signEvent({ kind, created_at, tags, content });
    } else {
        if (!privkeyHex) {
            throw new Error('No private key provided and NIP-07 extension not available');
        }
        const sk = hexToBytes(privkeyHex);
        return finalizeEvent({ kind, created_at, tags, content }, sk);
    }
}

async function prepareEventPayload(note: Note, privacyMode: PrivacyLevel) {
    // Calculate privacy tags
    const propertyTags = await getPrivacyTags(note.properties, privacyMode);

    const propertyIndexTags = privacyMode === 'private'
        ? []
        : note.properties.map(p => ['t', `prop:${p.key}`]);

    const tags: string[][] = [
        ['d', note.id],
        ...note.tags.map(t => ['t', t]),
        ...propertyIndexTags,
        ...propertyTags
    ];

    const created_at = Math.floor(Date.now() / 1000);
    const kind = note.properties.length > 0 ? KIND_SEMANTIC_NOTE : KIND_TEXT_NOTE;
    const content = note.content;

    return { tags, kind, created_at, content };
}
