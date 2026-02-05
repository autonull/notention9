import { shellTools } from '../cli/src/tools/shell.js';
import { fsTools } from '../cli/src/tools/fs.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
    try {
        console.log("Verifying Shell and FS Tools...");

        // 1. Verify Shell Tool: Echo
        console.log("1. Testing run_shell_command (echo)...");
        const shellTool = shellTools.find(t => t.name === 'run_shell_command');
        if (!shellTool) throw new Error("run_shell_command tool not found");

        const shellResult = await shellTool.execute({ command: 'echo "Hello from Shell"' });
        if (!shellResult.includes('Hello from Shell')) {
            throw new Error(`Shell echo failed. Output: ${shellResult}`);
        }
        console.log("   Shell tool verified.");

        // 2. Verify FS Tool: Create File
        console.log("2. Testing create_local_file...");
        const createTool = fsTools.find(t => t.name === 'create_local_file');
        const deleteTool = fsTools.find(t => t.name === 'delete_local_file');
        const searchTool = fsTools.find(t => t.name === 'search_local_files');

        if (!createTool || !deleteTool || !searchTool) throw new Error("FS Tools missing");

        const testFilePath = 'verification/temp_test_file.txt';
        const testContent = 'This is a test content for search.';

        await createTool.execute({ path: testFilePath, content: testContent });

        // Verify file exists
        const exists = await fs.stat(path.resolve(process.cwd(), testFilePath)).then(() => true).catch(() => false);
        if (!exists) throw new Error("File creation failed (fs check)");
        console.log("   File creation verified.");

        // 3. Verify FS Tool: Search
        console.log("3. Testing search_local_files...");
        const searchResult = await searchTool.execute({ query: 'test content', path: 'verification' });
        if (!searchResult.includes(testFilePath)) {
            // Grep output might vary, but should contain filename
            // Note: if verification folder has other matches, that's fine, as long as our file is there.
             throw new Error(`Search failed to find created file. Output: ${searchResult}`);
        }
        console.log("   File search verified.");

        // 4. Verify FS Tool: Delete
        console.log("4. Testing delete_local_file...");
        await deleteTool.execute({ path: testFilePath });
        const existsAfter = await fs.stat(path.resolve(process.cwd(), testFilePath)).then(() => true).catch(() => false);
        if (existsAfter) throw new Error("File deletion failed");
        console.log("   File deletion verified.");

        console.log("All Local Tools verified successfully.");
        process.exit(0);

    } catch (e: any) {
        console.error("Verification Failed:", e);
        process.exit(1);
    }
}

main();
