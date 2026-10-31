import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        define: {
            'import.meta.env': {
                DEV: true,
                PROD: false,
                MODE: 'test',
                PROJECT_ROOT: '/home/me/notention9',
                VITE_TELEMETRY: 'false',
                VITE_DEV_HOOKS: 'false',
            },
        },
    },
});