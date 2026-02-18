import { AgentServer } from './Server';
import { error } from './core/utils';

const server = new AgentServer();

server.start().catch(err => {
    error('System', 'Failed to start server', err);
    process.exit(1);
});

process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
});
