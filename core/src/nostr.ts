import { SimplePool, getPublicKey, finalizeEvent, Filter } from 'nostr-tools';
// Using internal utils or redefining if not exposed
// nostr-tools v2 usually exposes utils at top level or /utils path

import type { NostrEvent, Note, Property, PrivacyLevel } from './types/index.js';
import { NetworkGate, PrivacyError } from './networkGate.js';
import { getPrivacyTags } from './nostr/privacy.js';
import { hexToBytes } from './utils/encoding.js';
import { Logger } from './utils/logging.js';

export const KIND_TEXT_NOTE = 1;
export const KIND_SEMANTIC_NOTE = 35000;

interface NostrWindow extends Window {
  nostr?: {
    signEvent: (event: any) => Promise<NostrEvent>;
    getPublicKey?: () => Promise<string>;
  };
}

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://nostr-pub.wellorder.net',
  'wss://nos.lol',
];

export const pool = new SimplePool();

/**
 * Helper to query events using subscribeMany since SimplePool in v2 might lack list/query.
 * Aggregates events until EOSE or timeout.
 */
export const queryEvents = (
  pool: SimplePool,
  relays: string[],
  filters: Filter[]
): Promise<NostrEvent[]> => {
  return new Promise((resolve) => {
    const events: NostrEvent[] = [];

    // Use subscribeMap to support multiple filters per relay,
    // as subscribeMany in this version only accepts a single Filter.
    const requests = relays.flatMap(url =>
      filters.map(filter => ({ url, filter }))
    );

    const sub = pool.subscribeMap(requests, {
      onevent(event) {
        events.push(event as NostrEvent);
      },
      oneose() {
        sub.close();
        resolve(events);
      }
    });
    // Fallback timeout in case relays don't send EOSE
    setTimeout(() => {
        sub.close();
        resolve(events);
    }, 5000);
  });
};

export const formatNpub = (npub: string) =>
  `${npub.slice(0, 10)}...${npub.slice(-4)}`;

export const extractPropertiesFromTags = (tags: string[][]): Property[] => {
  const propsMap = tags.reduce((acc, t) => {
    if (t[0] === 'property') {
      const [, key, op, val] = t;
      if (acc.has(key)) {
        acc.get(key)!.values.push(val);
      } else {
        acc.set(key, { key, operator: op, values: [val] });
      }
    }
    return acc;
  }, new Map<string, Property>());

  return Array.from(propsMap.values());
};

export const convertEventToNote = (event: NostrEvent): Note => {
  return {
    id: event.id,
    title: '',
    content: event.content,
    tags: event.tags.reduce<string[]>((acc, t) => {
      if (t[0] === 't') acc.push(t[1]);
      return acc;
    }, []),
    publishedAt: new Date(event.created_at * 1000).toISOString(),
    properties: extractPropertiesFromTags(event.tags),
    createdAt: new Date(event.created_at * 1000).toISOString(),
    updatedAt: new Date(event.created_at * 1000).toISOString(),
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

  // Calculate privacy tags
  const propertyTags = await getPrivacyTags(note.properties, privacyMode);

  // Add indexable tags for properties to allow efficient discovery
  // We use 't' tags with a prefix 'prop:' so we can use standard hashtag indexing on relays.
  // Note: For 'private' mode, we do NOT expose property keys.
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

  // Use Kind 35000 (Semantic Note) if we have properties, otherwise Kind 1 (Text Note)
  const kind = note.properties.length > 0 ? KIND_SEMANTIC_NOTE : KIND_TEXT_NOTE;

  const content = note.content;

  let signedEvent: NostrEvent;

  // Check for window.nostr (NIP-07)
  // Use a safer check for window presence
  const hasWindow = typeof window !== 'undefined';
  const nostrWindow = hasWindow ? (window as unknown as NostrWindow) : undefined;

  if (nostrWindow?.nostr?.signEvent) {
    // Use NIP-07 extension
    const unsigned = {
      kind,
      created_at,
      tags,
      content
    };
    signedEvent = await nostrWindow.nostr.signEvent(unsigned);
  } else {
    // Use private key directly
    if (!privkeyHex) {
      throw new Error('No private key provided and NIP-07 extension not available');
    }
    const sk = hexToBytes(privkeyHex);

    const eventTemplate = {
      kind,
      created_at,
      tags,
      content,
    };

    signedEvent = finalizeEvent(eventTemplate, sk);
  }

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
  // Note: 'public' was already set to true by networkGate if confirmed
}
