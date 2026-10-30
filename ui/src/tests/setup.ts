import '@testing-library/jest-dom';
import { setupTestEnvironment, cleanupTestEnvironment, initMemoryGuard } from '@notention/core/test-utils';

setupTestEnvironment();
initMemoryGuard();

import { metaphorRegistry } from '@notention/core';

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