import { createExecutor } from './executorFactory.js';

export const assertNoConsoleErrorsExecutor = createExecutor({
    kind: 'assertNoConsoleErrors',
    execute: async ({ consoleEntries }) => {
        const errors = consoleEntries?.filter(e => e.type === 'error') ?? [];
        if (errors.length > 0) {
            throw new Error(`Console errors found: ${errors.map(e => e.text).join('; ')}`);
        }
        return { ok: true };
    },
});