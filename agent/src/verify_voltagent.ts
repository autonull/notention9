import { VoltAgentProvider } from './voltagent/index.js';
import { createNote } from '@notention/core';

async function verify() {
    console.log('🧪 Starting VoltAgent Verification...');

    // 1. Initialize Provider
    console.log('1. Initializing Provider...');
    const provider = new VoltAgentProvider({
        enabled: true,
        model: 'gpt-4o-mini',
        serverPort: 3146,
        memoryUrl: ':memory:',
        logLevel: 'error',
        features: {
            memory: true,
            rag: true,
            mcp: true,
            workflows: true,
            voice: false
        }
    });

    try {
        await provider.start();
        console.log('✅ Provider started');

        // 2. Check Status
        console.log('2. Checking Status...');
        const status = await provider.getStatus();
        console.log('Status:', status);
        if (status.state !== 'running') throw new Error('Agent not running');
        if (!status.capabilities.memory) throw new Error('Memory not enabled');
        console.log('✅ Status verification passed');

        // 3. Process Note
        console.log('3. Processing Note...');
        const note = createNote({
            title: 'Test Note',
            content: 'This is a verification note.',
            tags: ['verify']
        });

        const result = await provider.processNote(note);
        if (!result || result.length === 0) throw new Error('No result returned');
        console.log('✅ Note processed successfully');

        // 4. Memory Check
        console.log('4. Checking Memory...');
        await provider.storeMemory('test-key', { val: 1 });
        console.log('✅ Memory store called');

    } catch (e) {
        console.error('❌ Verification FAILED:', e);
        process.exit(1);
    } finally {
        await provider.stop();
        console.log('✅ Provider stopped');
    }
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
