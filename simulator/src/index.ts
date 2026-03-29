import { LocalRelay } from './relay.js';
import { ScenarioRunner } from './scenario.js';
import { GigEconomyScenario } from './scenarios/gigEconomy.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import chalk from 'chalk';
import ora from 'ora';

async function main() {
    console.log(chalk.bold.cyan("\n🤖 Notention Agent Simulator (Dedicated Process) 🤖\n"));

    const portArg = process.argv.find(arg => arg.startsWith('--port='));
    const relayPort = portArg ? parseInt(portArg.split('=')[1]) : 4444;
    const relayUrl = `ws://localhost:${relayPort}`;

    const relay = new LocalRelay(relayPort);
    console.log(chalk.gray(`Relay listening on ${relayUrl}`));

    const spinner = ora('Loading Ontology...').start();
    const ontology = DEFAULT_ONTOLOGY;
    spinner.succeed(`Ontology Loaded (${ontology.length} root nodes)`);

    const runner = new ScenarioRunner(relayUrl, ontology);

    try {
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
