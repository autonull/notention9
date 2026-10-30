#!/usr/bin/env node
// scripts/generate-showcases.ts - Generate capability showcase recordings on demand
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const moviesDir = join(rootDir, 'movies');

interface ShowcaseOptions {
    scenarios?: string[];
    all?: boolean;
    list?: boolean;
    fps?: number;
    width?: number;
    height?: number;
    outputDir?: string;
}

function parseArgs(): ShowcaseOptions {
    const args = process.argv.slice(2);
    const options: ShowcaseOptions = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--all') {
            options.all = true;
        } else if (arg === '--list') {
            options.list = true;
        } else if (arg === '--scenario' || arg === '-s') {
            options.scenarios = options.scenarios || [];
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                options.scenarios.push(args[++i]);
            }
        } else if (arg.startsWith('--scenario=')) {
            options.scenarios = options.scenarios || [];
            options.scenarios.push(arg.split('=')[1]);
        } else if (arg === '--fps' || arg === '-f') {
            options.fps = parseInt(args[++i], 10);
        } else if (arg === '--width') {
            options.width = parseInt(args[++i], 10);
        } else if (arg === '--height') {
            options.height = parseInt(args[++i], 10);
        } else if (arg === '--output' || arg === '-o') {
            options.outputDir = args[++i];
        } else if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        }
    }

    return options;
}

function printHelp(): void {
    console.log(`
Usage: pnpm showcase [options]

Generate capability showcase recordings for Notention workflows.

Options:
  --list                    List available scenarios
  --all                     Generate recordings for all scenarios
  --scenario <name>, -s    Generate recording for specific scenario (can repeat)
  --fps <number>, -f       Framerate (default: 2)
  --width <number>         Video width (default: 1920)
  --height <number>        Video height (default: 1080)
  --output <dir>, -o       Output directory (default: ./movies)
  --help, -h               Show this help

Examples:
  pnpm showcase --list
  pnpm showcase --all
  pnpm showcase -s golden-path -s freelance-marketplace
  pnpm showcase --all --fps 12 --width 1280 --height 720
`);
}

async function listScenarios(): Promise<void> {
    const { SCENARIOS, getScenarioNames } = await import('../simulator/src/scenarios/index.js');
    const names = getScenarioNames();
    console.log('\n📋 Available Showcase Scenarios:\n');
    for (const name of names) {
        const scenario = SCENARIOS[name];
        console.log(`  ${name}`);
        console.log(`    ${scenario.description}`);
        console.log(`    Agents: ${scenario.agents.reduce((sum, a) => sum + a.count, 0)} | Duration: ${scenario.duration}s | Difficulty: ${scenario.difficulty}`);
        console.log('');
    }
}

async function generateShowcase(scenarioName: string, options: ShowcaseOptions): Promise<void> {
    const { MovieMaker, MovieOptions } = await import('../simulator/src/movie_maker.js');
    const { SCENARIOS } = await import('../simulator/src/scenarios/index.js');
    const { ServerManager } = await import('../simulator/src/server_manager.js');
    const { DEFAULT_PORTS, DEFAULT_MOVIE_OPTIONS } = await import('../simulator/src/constants.js');

    const scenario = SCENARIOS[scenarioName];
    if (!scenario) {
        console.error(`❌ Scenario not found: ${scenarioName}`);
        return;
    }

    const outputDir = options.outputDir || join(rootDir, 'movies', `${scenario.name}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    mkdirSync(outputDir, { recursive: true });

    const serverManager = new ServerManager();
    const ports = await serverManager.start([], DEFAULT_PORTS.ui);

    const movieOptions: MovieOptions = {
        framerate: options.fps ?? DEFAULT_MOVIE_OPTIONS.framerate,
        resolution: {
            width: options.width ?? DEFAULT_MOVIE_OPTIONS.resolution.width,
            height: options.height ?? DEFAULT_MOVIE_OPTIONS.resolution.height,
        },
        uiPort: ports.ui,
        dashboardPort: ports.dashboard,
        outputDir,
        view: DEFAULT_MOVIE_OPTIONS.view,
        skipUiServer: true,
        onProgress: (msg) => console.log(`  ${msg}`),
        onError: (err) => console.error(`  Error: ${err.message}`),
    };

    console.log(`\n🎬 Generating showcase: ${scenario.name}`);
    console.log(`   Output: ${outputDir}`);
    console.log(`   Resolution: ${movieOptions.resolution.width}x${movieOptions.resolution.height} @ ${movieOptions.framerate}fps`);

    const movieMaker = new MovieMaker(serverManager.relayUrl, movieOptions);
    serverManager.closeDashboard();

    try {
        await movieMaker.start(scenario);
        console.log(`✅ Showcase generated: ${outputDir}/simulation.mp4`);
    } catch (err) {
        console.error(`❌ Failed to generate showcase: ${err}`);
        throw err;
    } finally {
        await serverManager.shutdown();
    }
}

async function main(): Promise<void> {
    const options = parseArgs();

    if (options.list) {
        await listScenarios();
        return;
    }

    if (!options.all && (!options.scenarios || options.scenarios.length === 0)) {
        console.log('No scenarios specified. Use --list to see available scenarios, --all for all, or -s <name> for specific ones.');
        printHelp();
        process.exit(1);
    }

    console.log('🎬 Notention Capability Showcase Generator');
    console.log('===========================================');

    if (options.all) {
        const { getScenarioNames } = await import('../simulator/src/scenarios/index.js');
        options.scenarios = getScenarioNames();
    }

    for (const scenarioName of options.scenarios!) {
        try {
            await generateShowcase(scenarioName, options);
        } catch (err) {
            console.error(`Failed to generate ${scenarioName}, continuing...`);
        }
    }

    console.log('\n✨ Showcase generation complete!');
    console.log(`Videos saved to: ${options.outputDir || moviesDir}`);
}

main().catch((err) => {
    console.error('Showcase generation failed:', err);
    process.exit(1);
});