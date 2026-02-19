import { ServerManager } from './server_manager.js';
import { ScenarioRunner, Scenario } from './scenario.js';
import { GigEconomyScenario } from './scenarios/gigEconomy.js';
import { generateScenario } from './scenarios/generator.js';
import { MovieMaker, MovieOptions } from './movie_maker.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

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
  --generate=<count>    Generate a random scenario with <count> agents
  --duration=<seconds>  Duration for generated scenario (default: 30)
  --script=<path>       Path to a JS/TS script exporting a Scenario object
  --list-scenarios      List available scenarios
  --movie               Run in Movie Maker mode (visual simulation)
  --fps=<number>        Framerate for movie (default: 2)
  --width=<number>      Video width (default: 1920)
  --height=<number>     Video height (default: 1080)
  --ui-port=<number>    Requested Port for UI server (default: 5173, auto-finds free port)
  --help                Show this help message
`);
        process.exit(0);
    }

    if (args.includes('--list-scenarios')) {
        console.log(chalk.bold("Available Scenarios:"));
        Object.keys(SCENARIOS).forEach(name => console.log(` - ${name}`));
        process.exit(0);
    }

    // Determine Scenario
    let scenario: Scenario;
    const genArg = args.find(arg => arg.startsWith('--generate='));
    const scriptArg = args.find(arg => arg.startsWith('--script='));

    if (genArg) {
        const count = parseInt(genArg.split('=')[1]);
        const durArg = args.find(arg => arg.startsWith('--duration='));
        const duration = durArg ? parseInt(durArg.split('=')[1]) : 30;
        scenario = generateScenario(count, duration);
        console.log(chalk.magenta(`Generated scenario with ${count} agents over ${duration}s`));
    } else if (scriptArg) {
        const scriptPath = scriptArg.split('=')[1];
        const absolutePath = path.resolve(process.cwd(), scriptPath);

        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`Error: Script not found at ${absolutePath}`));
            process.exit(1);
        }

        try {
            // Import using file:// URL for ESM
            const module = await import(pathToFileURL(absolutePath).href);
            if (module.default) {
                scenario = module.default;
            } else if (module.scenario) {
                scenario = module.scenario;
            } else {
                 throw new Error("Script must export a default Scenario object or a named 'scenario' export.");
            }
            console.log(chalk.magenta(`Loaded scenario from script: ${scenario.name}`));
        } catch (e) {
            console.error(chalk.red(`Error loading script: ${e}`));
            process.exit(1);
        }
    } else {
        const scenarioArg = args.find(arg => arg.startsWith('--scenario='));
        const scenarioName = scenarioArg ? scenarioArg.split('=')[1] : 'default';
        scenario = SCENARIOS[scenarioName];

        if (!scenario) {
            console.error(chalk.red(`Error: Scenario '${scenarioName}' not found.`));
            console.log("Available scenarios:", Object.keys(SCENARIOS).join(', '));
            process.exit(1);
        }
    }

    // Setup Servers
    const serverManager = new ServerManager();
    const requestedUiPortArg = args.find(a => a.startsWith('--ui-port='));
    const requestedUiPort = requestedUiPortArg ? parseInt(requestedUiPortArg.split('=')[1]) : 5173;

    let ports;
    try {
        // Start servers (Relay, UI, Dashboard placeholder)
        // We start dashboard with empty agents initially. MovieMaker will restart/update logic?
        // Actually, we'll let MovieMaker re-start the dashboard with correct agents using the same port.
        ports = await serverManager.start([], requestedUiPort);
    } catch (e) {
        console.error("Failed to start servers:", e);
        process.exit(1);
    }

    const spinner = ora('Loading Ontology...').start();
    const ontology = DEFAULT_ONTOLOGY;
    spinner.succeed(`Ontology Loaded (${ontology.length} root nodes)`);

    // Check for Movie Mode
    const isMovieMode = args.includes('--movie');

    try {
        if (isMovieMode) {
            const fpsArg = args.find(a => a.startsWith('--fps='));
            const fps = fpsArg ? parseInt(fpsArg.split('=')[1]) : 2;

            const widthArg = args.find(a => a.startsWith('--width='));
            const width = widthArg ? parseInt(widthArg.split('=')[1]) : 1920;

            const heightArg = args.find(a => a.startsWith('--height='));
            const height = heightArg ? parseInt(heightArg.split('=')[1]) : 1080;

            const viewArg = args.find(a => a.startsWith('--view='));
            const view = viewArg ? viewArg.split('=')[1] as 'dashboard' | 'ontology' : 'dashboard';

            // We need to re-start dashboard with actual agents after spawning.
            // MovieMaker does this?
            // In `movie_maker.ts`, `start` method:
            // 1. Start UI Server (ServerManager does this now)
            // 2. Prepare Scenario (Spawn Agents)
            // 3. Start Dashboard Server (Pass agents)

            // So we should NOT start dashboard in `ServerManager.start` if we want MovieMaker to do it.
            // Or we pass the `serverManager` to MovieMaker and let it call `startDashboard`.

            // Let's modify MovieMaker to accept `ServerManager` and use it.

            const options: MovieOptions = {
                framerate: fps,
                resolution: { width, height },
                uiPort: ports.ui,
                dashboardPort: ports.dashboard,
                outputDir: path.resolve(process.cwd(), 'movies'), // save to simulator/movies/
                view
            };

            const movieMaker = new MovieMaker(serverManager.relayUrl, options);

            // Hack: Stop the dashboard started by ServerManager so MovieMaker can start it with agents
            if (serverManager['dashboardServer']) {
                serverManager['dashboardServer'].close();
            }

            await movieMaker.start(scenario);
        } else {
            const runner = new ScenarioRunner(serverManager.relayUrl, ontology);
            await runner.run(scenario);
        }
    } catch (e) {
        console.error(chalk.red("Simulation Failed:"), e);
    } finally {
        console.log(chalk.yellow("\nStopping simulation..."));
        await serverManager.shutdown();
        process.exit();
    }
}

main().catch(console.error);
