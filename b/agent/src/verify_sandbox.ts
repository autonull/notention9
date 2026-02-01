
import { SandboxAgent } from './tester/SandboxAgent';

async function verifySandbox() {
    console.log('🧪 Verifying Sandbox Agent...');

    try {
        const sandbox = new SandboxAgent();
        await sandbox.initialize();

        // Run a mock scenario
        const result = await sandbox.runScenario('basic-test', { input: 'hello' });
        console.log('Result:', result);

        if (result.success) {
            console.log('✅ Sandbox verification passed');
        } else {
            console.error('❌ Sandbox verification failed');
        }

        await sandbox.shutdown();
    } catch (e) {
        console.error('❌ Sandbox Error:', e);
        process.exit(1);
    }
}

verifySandbox();
