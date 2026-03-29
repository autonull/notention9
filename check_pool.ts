import { SimplePool } from 'nostr-tools';
const pool = new SimplePool();
console.log('querySync:', typeof (pool as any).querySync);
