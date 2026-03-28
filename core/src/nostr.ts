import { SimplePool, utils } from 'nostr-tools';

import type { NostrEvent, Note, Property } from './types';

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://nostr-pub.wellorder.net',
  'wss://nos.lol',
];

/**
 * A shared Nostr SimplePool instance to be used across the entire application.
 * This prevents creating multiple WebSocket connections to the same relays and ensures
 * connection state is managed centrally.
 */
export const pool = new SimplePool();

export const { bytesToHex, hexToBytes } = utils;

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
    publishedAt: new Date(event.created_at * 1000).toISOString(), // Use publishedAt for event time
    properties: extractPropertiesFromTags(event.tags),
    createdAt: new Date(event.created_at * 1000).toISOString(),
    updatedAt: new Date(event.created_at * 1000).toISOString(),
    nostrEventId: event.id, // Explicitly set this

    // Provenance for Nostr imports
    source: {
      type: 'import',
      identifier: 'nostr-import',
      timestamp: Date.now()
    },

    // Nostr events are public by nature
    public: true,

    // Imported notes have lower priority
    priority: 0.5,
  };
};
