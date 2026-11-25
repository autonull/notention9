// Per-test setup for Vitest
// Runs before each test file

import { cleanupTestEnvironment, initMemoryGuard } from './testSetup.js';
import { metaphorRegistry } from '../index.js';

// Initialize metaphor registry for each test file (fresh state)
metaphorRegistry.clear();

// Initialize memory guard for each test file
initMemoryGuard();

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

export { cleanupTestEnvironment };