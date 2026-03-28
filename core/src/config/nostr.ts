export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://nostr-pub.wellorder.net',
  'wss://nos.lol',
];

/**
 * Resolve relay list, falling back to defaults if none provided or empty
 */
export const resolveRelays = (configured?: string[]): string[] =>
  (configured && configured.length > 0) ? configured : DEFAULT_RELAYS;
