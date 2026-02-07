import { CliClient } from '../cli/src/client.js';

async function main() {
    const client = new CliClient('http://localhost:3000/mcp/sse');
    try {
        await client.connect();
        console.log("Connected to MCP.");

        // Simulate creating a semantic note
        console.log("Creating semantic note...");
        const result = await client.callTool('create_note', {
            title: 'Semantic Verification Task',
            content: 'This is a test task created via verification script.',
            tags: ['test', 'semantic'],
            properties: [
                { key: 'type', operator: 'is', values: ['task'] },
                { key: 'priority', operator: 'is', values: ['high'] }
            ]
        });

        console.log("Create Result:", JSON.stringify(result, null, 2));

        const resultText = (result.content[0] as any).text;
        const match = resultText.match(/ID: ([\w-]+)/);
        if (!match) throw new Error("Failed to get Note ID");
        const noteId = match[1];
        console.log(`Created Note ID: ${noteId}`);

        // Verify properties were stored
        console.log("Verifying properties...");
        const readResult = await client.callTool('read_notes', { limit: 100 });

        // Log the raw read result to debug
        // console.log("Read Result Raw:", JSON.stringify(readResult, null, 2));

        const allNotes = JSON.parse((readResult.content[0] as any).text);
        console.log(`Read ${allNotes.length} notes.`);

        const note = allNotes.find((n: any) => n.id === noteId);

        if (!note) {
            console.error("Note IDs found:", allNotes.map((n: any) => n.id));
            throw new Error(`Note ${noteId} not found`);
        }

        const hasType = note.properties.some((p: any) => p.key === 'type' && p.values.includes('task'));
        const hasPriority = note.properties.some((p: any) => p.key === 'priority' && p.values.includes('high'));

        if (!hasType || !hasPriority) {
            console.error("Properties:", JSON.stringify(note.properties, null, 2));
            throw new Error("Semantic properties verification failed");
        }

        console.log("Semantic properties verified successfully.");

        // Cleanup
        await client.callTool('delete_note', { id: noteId });
        console.log("Cleanup complete.");

        await client.close();
        process.exit(0);

    } catch (e) {
        console.error("Verification failed:", e);
        process.exit(1);
    }
}

main();
