import { ConfigProcessor } from '../agent/src/configurator/ConfigProcessor.ts';
import { Capabilities } from '../agent/src/core/Capabilities.ts';
import type { Note } from '@notention/core';

async function main() {
    console.log("Starting Configuration Persistence Verification...");

    const caps = Capabilities.getInstance();
    caps.reset();

    const configNote: Note = {
        id: 'config-1',
        title: 'System Configuration',
        content: 'Enable browser and files.',
        tags: ['@config:active', 'system'],
        properties: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
        public: false,
        priority: 1
    };

    const processor = new ConfigProcessor();

    console.log("Scanning notes (Correct Key: capability:browser)...");
    configNote.properties = [
         { key: 'capability:browser', operator: 'is', values: ['true'] },
         { key: 'capability:files', operator: 'is', values: ['true'] }
    ];
    processor.scanForConfigs([configNote]);
    if (caps.isEnabled('browser')) {
        console.log("✅ Succeeded with capability:browser");
    } else {
        throw new Error("Failed to enable browser capability.");
    }

    if (caps.isEnabled('files')) {
        console.log("✅ Succeeded with capability:files");
    } else {
        throw new Error("Failed to enable files capability.");
    }
}

main().catch(e => {
    console.error("Verification Failed:", e);
    process.exit(1);
});
