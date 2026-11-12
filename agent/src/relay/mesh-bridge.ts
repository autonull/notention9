import { MeshBridge } from '../network/MeshBridge.js';
import { log } from '../core/utils.js';

const argValue = (name: string): string | undefined => {
    const index = process.argv.indexOf(`--${name}`);
    return index >= 0 ? process.argv[index + 1] : undefined;
};

const port = argValue('port') ?? '/dev/ttyUSB0';
const wsPort = Number(argValue('ws-port') ?? '8080');
const wsHost = argValue('ws-host') ?? '127.0.0.1';
const baudRate = Number(argValue('baud-rate') ?? '921600');

const bridge = new MeshBridge({
    port,
    wsPort,
    wsHost,
    baudRate,
});

async function main(): Promise<void> {
    log('Bridge', `Starting mesh bridge: ${port} -> ws://${wsHost}:${wsPort}`);
    
    await bridge.start();

    process.on('SIGINT', async () => {
        log('Bridge', 'Shutting down...');
        await bridge.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        log('Bridge', 'Shutting down...');
        await bridge.stop();
        process.exit(0);
    });
}

main().catch((err) => {
    log('Bridge', 'Failed to start bridge', err);
    process.exit(1);
});