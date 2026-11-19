import { SimplePool, finalizeEvent, Filter } from 'nostr-tools';
import type { NostrEvent, Note, Property, PrivacyLevel } from '../../types/index.js';
import { NetworkGate, PrivacyError } from '../networkGate.js';
import { getPrivacyTags } from './privacy.js';
import { hexToBytes } from '../../utils/encoding.js';
import { Logger } from '../../utils/logging.js';
import { DEFAULT_RELAYS, resolveRelays } from '../../config/nostr.js';
import { queryEventsWithTimeout } from '../../utils/nostrQuery.js';
import { withTimeout } from '../../utils/async.js';
import { redactPIIForTransport } from '../../utils/piiRedaction.js';
import { relayHealthManager, type RelayHealthMetrics } from './relayHealth.js';

export { DEFAULT_RELAYS, resolveRelays };
export const KIND_TEXT_NOTE = 1;
export const KIND_SEMANTIC_NOTE = 35000;
/** NIP-09 deletion request. */
export const KIND_DELETION = 5;

export interface PublishOptions {
  /** Mask emails, phones, and SSNs in the event body before signing. */
  redactPII?: boolean;
}

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

// Export for external use (e.g., sync budget)
export { publishEventToRelays };

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

const PUBLISH_TIMEOUT_MS = 10_000;

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
  signer?: NostrSigner,
  options: PublishOptions = {}
): Promise<string> {
  const canPublish = await networkGate.canTransmit(
    note,
    'Nostr network',
    promptUserCallback
  );

  if (!canPublish) {
    throw new PrivacyError('Publication cancelled - note is private');
  }

  const activeSigner = signer ?? DefaultSignerFactory.getSigner(privkeyHex);
  const signedEvent = await prepareAndSignEvent(note, activeSigner, privacyMode, options);

  await publishEventToRelays(signedEvent, relays);

  note.nostrEventId = signedEvent.id;
  note.publishedAt = new Date().toISOString();
  note.author = signedEvent.pubkey;
  return signedEvent.id;
}

/**
 * NIP-09: ask relays to delete a published note.
 * Best-effort: relays may ignore the request, and the local copy is separate.
 * Returns the deletion event id, or `null` when the note was never published.
 */
export function buildDeletionRequest(note: Note): { kind: number; tags: string[][]; content: string; created_at: number } | null {
  if (!note.nostrEventId) return null;

  const deletedKind = note.properties.length > 0 ? KIND_SEMANTIC_NOTE : KIND_TEXT_NOTE;
  const tags: string[][] = [
    ['e', note.nostrEventId],
    ['k', String(deletedKind)],
  ];

  // Addressable (30000–39999) events need an `a` tag to retract every version.
  if (deletedKind === KIND_SEMANTIC_NOTE && note.author) {
    tags.push(['a', `${KIND_SEMANTIC_NOTE}:${note.author}:${note.id}`]);
  }

  return {
    kind: KIND_DELETION,
    tags,
    content: '',
    created_at: Math.floor(Date.now() / 1000),
  };
}

export async function publishDeletionRequest(
  note: Note,
  privkeyHex: string | undefined,
  relays: string[] = DEFAULT_RELAYS,
  signer?: NostrSigner
): Promise<string | null> {
  const payload = buildDeletionRequest(note);
  if (!payload) return null;

  const activeSigner = signer ?? DefaultSignerFactory.getSigner(privkeyHex);
  const deletion = await activeSigner.signEvent(payload);

  await publishEventToRelays(deletion, relays);
  return deletion.id;
}

async function publishEventToRelays(event: NostrEvent, relays: string[]): Promise<void> {
  if (relays.length === 0) {
    throw new Error('No relays configured for publishing');
  }

  // Sort relays by health score (best first) for failover
  const sortedRelays = relayHealthManager.getSortedRelays(relays);
  const logger = Logger.getInstance();

  // Track per-relay outcomes for health recording
  const relayOutcomes = new Map<string, { success: boolean; latency?: number; error?: string }>();

  // Try relays in health order with concurrency limit
  const CONCURRENCY = 3;
  let deliveredCount = 0;
  const MIN_DELIVERIES = 1; // At least 1 relay must accept

  for (let i = 0; i < sortedRelays.length; i += CONCURRENCY) {
    const batch = sortedRelays.slice(i, i + CONCURRENCY);
    const pubs = pool.publish(batch, event);

    try {
      const outcomes = await withTimeout(
        Promise.allSettled(pubs),
        PUBLISH_TIMEOUT_MS,
        `Batch ${Math.floor(i / CONCURRENCY) + 1} timed out`
      );

      for (let j = 0; j < batch.length; j++) {
        const url = batch[j];
        const outcome = outcomes[j];

        const isConnectionFailure = (value: unknown): boolean =>
            typeof value === 'string' && value.startsWith('connection failure');

        if (outcome.status === 'fulfilled' && !isConnectionFailure(outcome.value)) {
            deliveredCount++;
            relayOutcomes.set(url, { success: true });
        } else {
            const error = outcome.status === 'rejected'
                ? (outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason))
                : String(outcome.value);
            relayOutcomes.set(url, { success: false, error });
        }
      }

      // Failover: stop early if we have enough deliveries
      if (deliveredCount >= MIN_DELIVERIES && i + CONCURRENCY >= sortedRelays.length) {
          break;
      }
      if (deliveredCount >= MIN_DELIVERIES * 2) {
          // Got double the minimum, good enough
          break;
      }
    } catch (e) {
      logger.warn(`Publish batch failed`, e as Error);
      for (const url of batch) {
          if (!relayOutcomes.has(url)) {
              relayOutcomes.set(url, { success: false, error: String(e) });
          }
      }
    }
  }

  // Record health metrics for all attempted relays
  for (const [url, outcome] of relayOutcomes) {
      relayHealthManager.recordPublish(url, outcome.success, outcome.error);
  }

  if (deliveredCount === 0) {
      const reasons = Array.from(relayOutcomes.entries())
          .filter(([, o]) => !o.success)
          .map(([, o]) => o.error || 'unknown error');
      throw new Error(reasons.filter(Boolean).join('; ') || 'No relay accepted the event');
  }

  logger.info(`Published to ${deliveredCount}/${relayOutcomes.size} relays`);
}

async function prepareAndSignEvent(
    note: Note,
    signer: NostrSigner,
    privacyMode: PrivacyLevel,
    options: PublishOptions = {}
): Promise<NostrEvent> {
    const payload = await prepareEventPayload(note, privacyMode, options);
    return signer.signEvent(payload);
}

async function prepareEventPayload(note: Note, privacyMode: PrivacyLevel, options: PublishOptions = {}) {
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
    const content = options.redactPII ? redactPIIForTransport(note.content) : note.content;

    return { tags: uniqueTags, kind, created_at, content };
}
