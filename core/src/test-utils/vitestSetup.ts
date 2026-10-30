import { setupTestEnvironment, cleanupTestEnvironment, initMemoryGuard } from './testSetup.js';

setupTestEnvironment();
initMemoryGuard();

import { metaphorRegistry } from '../index.js';

afterEach(() => {
    cleanupTestEnvironment();
    metaphorRegistry.clear();
});

afterAll(() => {
    vi.clearAllMocks();
    metaphorRegistry.clear();
    if (global.gc) {
        global.gc();
    }
});

export { setupTestEnvironment, cleanupTestEnvironment, initMemoryGuard };