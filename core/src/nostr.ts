import { SimplePool, getPublicKey, finalizeEvent } from 'nostr-tools';
// Using internal utils or redefining if not exposed
// nostr-tools v2 usually exposes utils at top level or /utils path

import type { NostrEvent, Note, Property, PrivacyLevel } from './types/index.js';
import { NetworkGate, PrivacyError } from './networkGate.js';
import { getPrivacyTags } from './nostr/privacy.js';

// Polyfill-ish implementation for hex conversion to avoid deep imports
export const hexToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

// Simple Promise.any polyfill for ES2020 target
const promiseAny = <T>(promises: Promise<T>[]): Promise<T> => {
  return new Promise((resolve, reject) => {
    let errors: any[] = [];
    let rejectedCount = 0;
    if (promises.length === 0) {
      reject(new Error('No promises'));
      return;
    }
    promises.forEach((p) => {
      p.then(resolve).catch((e) => {
        errors.push(e);
        rejectedCount++;
        if (rejectedCount === promises.length) {
          reject(new Error(`All promises rejected: ${errors.map(e => e.message).join(', ')}`));
        }
      });
    });
  });
};

export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://nostr-pub.wellorder.net',
  'wss://nos.lol',
];

export const pool = new SimplePool();

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

  const tags: string[][] = [
    ['d', note.id],
    ...note.tags.map(t => ['t', t]),
    ...propertyTags
  ];

  const created_at = Math.floor(Date.now() / 1000);

  // Use Kind 35000 (Semantic Note) if we have properties, otherwise Kind 1 (Text Note)
  const kind = note.properties.length > 0 ? 35000 : 1;

  const content = note.content;

  let signedEvent: NostrEvent;

  // Check for window.nostr (NIP-07)
  // Use a safer check for window presence
  const hasWindow = typeof window !== 'undefined';

  if (hasWindow && (window as any).nostr?.signEvent) {
    // Use NIP-07 extension
    const unsigned = {
      kind,
      created_at,
      tags,
      content
    };
    signedEvent = await (window as any).nostr.signEvent(unsigned);
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
    await promiseAny(pubs);
  } catch (e) {
    console.warn('Failed to publish to any relay', e);
    throw e;
  }

  note.nostrEventId = signedEvent.id;
  note.publishedAt = new Date().toISOString();
  // Note: 'public' was already set to true by networkGate if confirmed
}
