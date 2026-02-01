import { SimplePool, utils, finalizeEvent } from 'nostr-tools';

import type { NostrEvent, Note, Property } from './types';
import { NetworkGate, PrivacyError } from './networkGate';
import { getTextFromHtml } from './parsing';

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

// Implement hex/bytes helpers manually to ensure availability regardless of nostr-tools version
export const hexToBytes = (hex: string): Uint8Array => {
  if (typeof hex !== 'string') {
    throw new TypeError(`hexToBytes: expected string, got ${typeof hex}`);
  }
  if (hex.length % 2) {
    throw new Error('hexToBytes: received string with odd length');
  }
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('hexToBytes: invalid hex string');
    }
    array[i] = byte;
  }
  return array;
};

export const bytesToHex = (bytes: Uint8Array): string => {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
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

export async function publishNoteToNostr(
  note: Note,
  privkey: string,
  relays: string[] = DEFAULT_RELAYS,
  promptUser?: (message: string) => Promise<boolean>
): Promise<string> {
  const networkGate = new NetworkGate();

  // Privacy check
  // This will throw PrivacyError if note is private and no promptUser is provided
  const canTransmit = await networkGate.canTransmit(note, 'Nostr network', promptUser);

  if (!canTransmit) {
     throw new Error('Publication cancelled - note is private');
  }

  const privkeyBytes = hexToBytes(privkey);
  const content = getTextFromHtml(note.content);

  const tags = note.tags.map(tag => ['t', tag]);

  note.properties.forEach(prop => {
    if (prop.values.length > 0) {
      prop.values.forEach(val => {
        tags.push(['property', prop.key, prop.operator, val]);
      });
    }
  });

  const created_at = Math.floor(Date.now() / 1000);

  const eventTemplate = {
    kind: 1,
    created_at,
    tags,
    content: `${note.title}\n\n${content}`,
  };

  const signedEvent = finalizeEvent(eventTemplate, privkeyBytes);

  const pubs = pool.publish(relays, signedEvent);
  await Promise.any(pubs);

  return signedEvent.id;
}
