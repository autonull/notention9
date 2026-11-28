import { createSimpleExecutor } from './executorFactory.js';

export const seedExecutor = createSimpleExecutor({
    kind: 'seed',
    execute: () => ({ ok: true }),
});