import { CliClient } from '../cli/src/client.js';
import { createIngestTools } from '../cli/src/tools/ingest.js';
import path from 'path';

async function main() {
    const client = new CliClient('http://localhost:3000/mcp/sse');
    try {
        await client.connect();
        console.log("Connected to MCP.");

        // Instantiate ingestion tool with client
        const ingestTools = createIngestTools(client);
        const ingestTool = ingestTools.find(t => t.name === 'ingest_file');

        if (!ingestTool) throw new Error("ingest_file tool not found");

        const testFilePath = 'verification/test_ingest_code.ts';

        console.log("Ingesting file...");
        const result = await ingestTool.execute({ path: testFilePath });
        console.log("Ingest Result:", result);

        if (!result.includes('Successfully ingested')) {
            throw new Error("Ingestion failed message");
        }

        // Extract ID to verify properties
        const match = result.match(/ID: ([\w-]+)/);
        if (!match) throw new Error("Could not extract ID from result");
        const noteId = match[1];

        // Verify tags and properties
        const readResult = await client.callTool('read_notes', { limit: 100 });
        const allNotes = JSON.parse((readResult.content[0] as any).text);
        const note = allNotes.find((n: any) => n.id === noteId);

        if (!note) throw new Error("Created note not found");

        const hasTag = note.tags.includes('typescript');
        const hasProp = note.properties.some((p: any) => p.key === 'type' && p.values.includes('file'));

        if (!hasTag || !hasProp) throw new Error("Metadata verification failed");

        console.log("Ingestion Verified Successfully.");

        // Cleanup
        await client.callTool('delete_note', { id: noteId });

        await client.close();
        process.exit(0);

    } catch (e) {
        console.error("Verification failed:", e);
        process.exit(1);
    }
}

main();
