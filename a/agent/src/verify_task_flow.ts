import { clawdBotCoordinator } from '../moltbot/src/ClawdBotCoordinator';
import { createNote } from '@notention/core';

// Mock Bridge
const mockBridge = {
    callbacks: new Map<string, Function>(),
    isConnected: true,
    sendCommand: (command: string, payload: any) => {
        console.log(`\nBRIDGE MOCK: Sending Command: ${command}`);
        console.log(`PAYLOAD: ${JSON.stringify(payload, null, 2)}`);
        return Promise.resolve();
    },
    on: (event: string, cb: Function) => {
        console.log(`BRIDGE MOCK: Registered listener for '${event}'`);
        // Store callback to simulate events later
        // In this simple mock we just assign it to a property we can call
        (mockBridge as any).trigger = cb;
    },
    trigger: (msg: any) => { } // Placeholder
};

async function verify() {
    console.log('🧪 Starting Task Flow Verification...');

    // 1. Setup Coordinator with Mock Bridge
    clawdBotCoordinator.setBridge(mockBridge);

    // 2. Seed Context Notes
    console.log('\n🌱 Seeding successfully Context Notes...');
    const contextNote = createNote({
        title: 'React Tech Stack',
        content: 'We use React 18, TypeScript, and Vite.',
        tags: ['research', 'react', 'tech'],
    });
    clawdBotCoordinator.onNoteCreated(contextNote);

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
    await clawdBotCoordinator.processNote(taskNote);

    // 5. Simulate Inbound Response (Agent Result)
    console.log('\n📨 Simulating Inbound Agent Response...');
    const mockResponse = {
        type: 'agent_response',
        payload: {
            taskId: taskNote.id,
            content: 'I found 5 jobs at Google, Meta, etc.',
            result: [{ title: 'Senior React Dev', company: 'Google' }]
        }
    };

    // Trigger the mock bridge event
    (mockBridge as any).trigger(mockResponse);

    console.log('\n✅ Verification Completed.');
}

verify().catch(console.error);
