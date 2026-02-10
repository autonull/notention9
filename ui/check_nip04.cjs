const {nip04} = require('nostr-tools');

console.log('Checking nip04...');
if (typeof nip04.encrypt === 'function' && typeof nip04.decrypt === 'function') {
    console.log('nip04 is available and has encrypt/decrypt methods.');
} else {
    console.error('nip04 is MISSING or invalid.');
    process.exit(1);
}
