
import { Capabilities } from '../agent/src/core/Capabilities.js';
import { executeAction } from '../agent/src/core/actionExecutor.js';

async function runTest() {
    console.log("Starting Capabilities Verification...");

    // Test 1: Browser Disabled (Default)
    Capabilities.getInstance().reset(); // Ensure default state (browser: false)
    console.log("Test 1: Browser Disabled Check");
    try {
        await executeAction({ type: 'browser', url: 'http://example.com' });
        console.error("FAIL: Browser action should have thrown an error.");
        process.exit(1);
    } catch (e: any) {
        if (e.message.includes("Capability 'browser' is disabled")) {
            console.log("PASS: Browser action blocked correctly.");
        } else {
            console.error("FAIL: Unexpected error message:", e.message);
            process.exit(1);
        }
    }

    // Test 2: Browser Enabled
    console.log("Test 2: Browser Enabled Check");
    Capabilities.getInstance().set('browser', true);
    try {
        await executeAction({ type: 'browser', url: 'http://example.com' });
        // If we get here, it means it passed the capability check.
        // It might fail on playwright import or launch, which is fine for this test.
        console.log("PASS: Browser action proceeded past capability check.");
    } catch (e: any) {
        if (e.message.includes("Capability 'browser' is disabled")) {
             console.error("FAIL: Browser action blocked despite being enabled.");
             process.exit(1);
        }
        // If it fails due to playwright not found or connection error, that's expected in this environment
        // and proves we passed the capability check.
        console.log("PASS: Browser action proceeded past capability check (failed downstream as expected: " + e.message + ")");
    }

    console.log("All capability tests passed!");
}

runTest().catch(console.error);
