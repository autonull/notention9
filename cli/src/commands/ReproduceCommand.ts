import { createCommand } from './command.js';
import { parseOptimizeIntent } from '@notention/optimize/intent';
import { loadBundle, planReplay } from '@notention/optimize/replay';

export const ReproduceCommand = createCommand({
    name: 'reproduce',
    description: 'Reproduce a finding or run',
    usage: 'reproduce <findingId|runId>',
    validate: (args) => args.length > 0,
    async run(args, context) {
        const [target] = args;
        const intent = parseOptimizeIntent(['reproduce', target]);

        if (!intent.target) {
            console.error('Finding ID or runId required');
            return false;
        }

        // Try to load as runId first
        const bundle = await loadBundle(intent.target);
        if (bundle) {
            console.log(`🔁 Replaying run: ${intent.target}`);
            const { command, env } = planReplay(bundle);
            console.log(`Command: ${command}`);
            console.log(`Env: ${JSON.stringify(env)}`);
            return true;
        }

        // Try as finding ID
        console.log(`🔁 Reproducing finding: ${intent.target}`);
        console.log('Finding reproduction not yet implemented');
        return false;
    }
});