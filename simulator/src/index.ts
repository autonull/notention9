import { LocalRelay } from './relay.js';
import { ScenarioRunner, Scenario } from './scenario.js';
import { GigEconomyScenario } from './scenarios/gigEconomy.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import chalk from 'chalk';
import ora from 'ora';

const SCENARIOS: Record<string, Scenario> = {
    'gig-economy': GigEconomyScenario,
    'default': GigEconomyScenario
};

async function main() {
    console.log(chalk.bold.cyan("\n🤖 Notention Agent Simulator (Dedicated Process) 🤖\n"));

    const args = process.argv.slice(2);
    if (args.includes('--help')) {
        console.log(`
Usage: node dist/index.js [options]

Options:
  --port=<number>       Port for the local relay (default: 4444)
  --scenario=<name>     Name of the scenario to run (default: gig-economy)
  --list-scenarios      List available scenarios
  --help                Show this help message
`);
        process.exit(0);
    }

    if (args.includes('--list-scenarios')) {
        console.log(chalk.bold("Available Scenarios:"));
        Object.keys(SCENARIOS).forEach(name => console.log(` - ${name}`));
        process.exit(0);
    }

    const portArg = args.find(arg => arg.startsWith('--port='));
    const relayPort = portArg ? parseInt(portArg.split('=')[1]) : 4444;
    const relayUrl = `ws://localhost:${relayPort}`;

    const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
    const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'default';
    const scenario = SCENARIOS[scenarioName];

    if (!scenario) {
        console.error(chalk.red(`Error: Scenario '${scenarioName}' not found.`));
        console.log("Available scenarios:", Object.keys(SCENARIOS).join(', '));
        process.exit(1);
    }

    const relay = new LocalRelay(relayPort);
    // console.log(chalk.gray(`Relay listening on ${relayUrl}`));

    const spinner = ora('Loading Ontology...').start();
    const ontology = DEFAULT_ONTOLOGY;
    spinner.succeed(`Ontology Loaded (${ontology.length} root nodes)`);

    const runner = new ScenarioRunner(relayUrl, ontology);

    try {
        await runner.run(scenario);
    } catch (e) {
        console.error(chalk.red("Scenario Failed:"), e);
    } finally {
        console.log(chalk.yellow("\nStopping simulation..."));
        relay.stop();
        process.exit();
    }
}

main().catch(console.error);
