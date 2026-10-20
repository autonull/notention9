import {spawn} from 'node:child_process';

const run = (command, args, env = {}) => {
    const child = spawn(command, args, {
        stdio: 'inherit',
        shell: false,
        env: {...process.env, ...env},
    });
    child.on('exit', code => {
        if (code !== 0) process.exitCode = code;
        shutdown();
    });
    return child;
};

const children = [
    run('pnpm', ['--filter', '@notention/agent', 'start', '--', '--relay']),
    run('pnpm', ['--filter', '@notention/ui', 'dev'], {
        VITE_ENABLE_AGENT: 'true',
    }),
];

let stopping = false;

const shutdown = () => {
    if (stopping) return;
    stopping = true;
    children.forEach(child => child.kill('SIGTERM'));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
