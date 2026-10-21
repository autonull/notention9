import {NostrRelay} from '@notention/core';
import { DEFAULT_PORTS } from '../constants.js';

const argValue = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
};

const port = Number(argValue('port') ?? DEFAULT_PORTS.RELAY);
const host = argValue('host') ?? '127.0.0.1';
const relay = new NostrRelay({port, host});

console.log(`Local relay listening on ${relay.url}`);

process.on('SIGINT', async () => {
    await relay.close();
    process.exit(0);
});
