
import { VoltAgentProvider, VoltAgentConfig } from '@notention/agent-voltagent';
import { TestEnvironment } from '../../../core/src/testing/TestEnvironment';

export class SandboxAgent {
    private provider: VoltAgentProvider | null = null;
    private env: TestEnvironment;

    constructor() {
        this.env = new TestEnvironment();
    }

    async initialize() {
        const context = await this.env.setup();

        const testConfig: VoltAgentConfig = {
            enabled: true,
            model: 'test-model',
            serverPort: 0, // Random port
            memoryUrl: context.dbUrl,
            logLevel: 'error',
            features: {
                memory: true,
                rag: false,
                mcp: false,
                workflows: true,
                voice: false
            }
        };

        this.provider = new VoltAgentProvider(testConfig);
        await this.provider.start();
        console.log('SandboxAgent: Initialized with test config');
    }

    async runScenario(name: string, input: any) {
        if (!this.provider) throw new Error("Sandbox not initialized");
        console.log(`SandboxAgent: Running scenario '${name}'`);

        // Mock execution
        // in reality, we would inject the input Note and wait for results
        return { success: true, result: "Scenario passed (mock)" };
    }

    async shutdown() {
        if (this.provider) {
            await this.provider.stop();
        }
        await this.env.teardown();
    }
}
