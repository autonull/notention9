import { startVitest } from 'vitest/node';

async function runTests() {
  await startVitest('run', [], {
    // Vitest will automatically read the config from vite.config.ts
  });
  // The close() call is only needed in watch mode, which we are not using.
}

runTests();
