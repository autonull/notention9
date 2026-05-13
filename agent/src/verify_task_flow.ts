import { createNote } from '@notention/core';
import { VoltAgentProvider } from './voltagent/index.js';

async function verify() {
    console.log('🧪 Starting Task Flow Verification...');

    // 1. Initialize VoltAgentProvider
    const voltagent = new VoltAgentProvider({
        enabled: true,
        model: 'gpt-4o-mini',
        serverPort: 3141,
        memoryUrl: ':memory:',
        logLevel: 'info',
        features: {
            memory: true,
            rag: true,
            mcp: true,
            workflows: true,
            voice: false
        }
    });

    await voltagent.start();

    // 2. Seed Context Notes
    console.log('\n🌱 Seeding successfully Context Notes...');
    const contextNote = createNote({
        title: 'React Tech Stack',
        content: 'We use React 18, TypeScript, and Vite.',
        tags: ['research', 'react', 'tech'],
    });

    // Process the context note
    await voltagent.processNote(contextNote);

    // 3. Create a Mock Task Note
    const taskNote = createNote({
        title: 'Research React Jobs',
        content: 'Please find 5 senior React developer jobs in New York.',
        tags: ['task', 'research'],
        properties: [
            { key: 'type', operator: 'is', values: ['task'] },
            { key: 'assignee', operator: 'is', values: ['Assistant'] },
            { key: 'status', operator: 'is', values: ['pending'] }
        ]
    });

    console.log(`📝 Created Task Note: ${taskNote.title} (${taskNote.id})`);

    // 4. Process the Task Note (Outbound)
    console.log('\n⚙️ Processing Task Note (Outbound)...');
    const results = await voltagent.processNote(taskNote);
    console.log(`\n📊 Received ${results.length} results from agent processing`);

    // 5. Simulate Inbound Response (Agent Result)
    console.log('\n📨 Simulating Inbound Agent Response...');
    for (const result of results) {
        console.log(`   • Result: ${result.title}`);
    }

    await voltagent.stop();
    console.log('\n✅ Verification Completed.');
}

verify().catch(console.error);
