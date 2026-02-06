import { fsTools } from '../cli/dist/tools/fs.js';

async function main() {
    const listTool = fsTools.find(t => t.name === 'list_local_files');
    if (!listTool) throw new Error("Tool not found");

    console.log("Testing Path Traversal Security...");

    const result = await listTool.execute({ path: '../' });
    if (typeof result === 'string' && result.includes('Access denied')) {
        console.log("✅ Blocked ../ successfully.");
    } else {
        console.error("❌ Failed to block ../. Result:", result);
        process.exit(1);
    }

    // Test valid path
    const validResult = await listTool.execute({ path: '.' });
    if (Array.isArray(validResult)) {
        console.log("✅ Allowed . successfully.");
    } else {
        console.error("❌ Failed to allow .. Result:", validResult);
        process.exit(1);
    }
}

main();
