import { LocalRelay } from './relay.js';
import { ScenarioRunner } from './scenario.js';
import { GigEconomyScenario } from './scenarios/gigEconomy.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import chalk from 'chalk';
import ora from 'ora';

async function main() {
    console.log(chalk.bold.cyan("\n🤖 Notention Agent Simulator (Dedicated Process) 🤖\n"));

    const relayPort = 4444;
    const relayUrl = `ws://localhost:${relayPort}`;

    // Start local relay
    const relay = new LocalRelay(relayPort);
    console.log(chalk.gray(`Relay listening on ${relayUrl}`));

    const spinner = ora('Loading Ontology...').start();
    // In a real app, this might load from disk or network
    const ontology = DEFAULT_ONTOLOGY;
    spinner.succeed(`Ontology Loaded (${ontology.length} root nodes)`);

    // Setup Scenario Runner
    const runner = new ScenarioRunner(relayUrl, ontology);

    try {
        // Run the default scenario (Gig Economy)
        // In future, this could be CLI argument driven
        await runner.run(GigEconomyScenario);
    } catch (e) {
        console.error(chalk.red("Scenario Failed:"), e);
    } finally {
        console.log(chalk.yellow("\nStopping simulation..."));
        relay.stop();
        process.exit();
    }
}

main().catch(console.error);
