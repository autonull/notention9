import fs from 'fs';
import path from 'path';
import { createIngestTools } from '../cli/dist/tools/ingest.js';
import { CliClient } from '../cli/dist/client.js';

// Mock Client
class MockCliClient {
    public calls: any[] = [];
    async callTool(name: string, args: any) {
        this.calls.push({ name, args });
        return {
            content: [{ text: `Note created with ID: mock-id-${this.calls.length}` }]
        };
    }
}

async function main() {
    const tempDir = path.resolve('temp_ingest_test');

    // Setup Temp Directory Structure
    // temp_ingest_test/
    //   file1.ts
    //   file2.md
    //   subdir/
    //     file3.json
    //   node_modules/
    //     ignore.js
    //   .git/
    //     ignore_me
    //   image.png (binary)

    try {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir);
        fs.writeFileSync(path.join(tempDir, 'file1.ts'), 'console.log("hello");');
        fs.writeFileSync(path.join(tempDir, 'file2.md'), '# Hello');

        fs.mkdirSync(path.join(tempDir, 'subdir'));
        fs.writeFileSync(path.join(tempDir, 'subdir', 'file3.json'), '{}');

        fs.mkdirSync(path.join(tempDir, 'node_modules'));
        fs.writeFileSync(path.join(tempDir, 'node_modules', 'ignore.js'), 'ignore');

        fs.mkdirSync(path.join(tempDir, '.git'));
        fs.writeFileSync(path.join(tempDir, '.git', 'config'), 'ignore');

        // Create a fake binary file (null bytes)
        const buffer = Buffer.alloc(10);
        buffer[0] = 0;
        fs.writeFileSync(path.join(tempDir, 'image.png'), buffer);

        // Run Test
        const mockClient = new MockCliClient() as unknown as CliClient;
        const tools = createIngestTools(mockClient);
        const ingestTool = tools[0];

        console.log("Running ingestion...");
        const result = await ingestTool.execute({ path: tempDir });
        console.log("Result:", result);

        // Verify Calls
        const calls = (mockClient as any).calls;
        console.log(`Made ${calls.length} calls to create_note.`);

        const ingestedFiles = calls.map((c: any) => c.args.properties.find((p: any) => p.key === 'path').values[0]);
        console.log("Ingested paths:", ingestedFiles);

        // Assertions

        // Helper to check if file was ingested
        const wasIngested = (filename: string) => ingestedFiles.some((p: string) => p.endsWith(filename));

        if (!wasIngested('file1.ts')) throw new Error("file1.ts missing");
        if (!wasIngested('file2.md')) throw new Error("file2.md missing");
        if (!wasIngested('file3.json')) throw new Error("file3.json missing");

        if (wasIngested('ignore.js')) throw new Error("node_modules should be ignored");
        if (wasIngested('config')) throw new Error(".git should be ignored");
        if (wasIngested('image.png')) throw new Error("Binary file should be ignored");

        console.log("✅ Verification Passed!");

    } catch (e) {
        console.error("❌ Verification Failed:", e);
        // Cleanup on failure too
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        process.exit(1);
    }

    // Cleanup
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
}

main();
