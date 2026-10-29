import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { findFindingById } from '../findingRepository.js';
import { getKnownJourney } from '../knownJourneys.js';
import { journeyToSimulatorScenario, findingToSimulatorScenario } from '../discovery/simulatorScenarioGenerator.js';
import { SCENARIOS } from '@notention/simulator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SimulatorResult {
    success: boolean;
    videoPath?: string;
    error?: string;
}

export async function runSimulatorRegression(target: string, json: boolean, headless: boolean = false): Promise<number> {
    const simulatorDir = path.resolve(__dirname, '../../../simulator');
    const outputDir = path.resolve(simulatorDir, 'movies');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`🎬 Starting simulator regression for: ${target}${headless ? ' (headless)' : ''}`);
    console.log(`📁 Output directory: ${outputDir}`);

    let scenarioName: string;
    let scenario: any;

    const lookup = await findFindingById(target);
    if (lookup) {
        console.log(`🔍 Found finding: ${lookup.finding.title} (journey: ${lookup.finding.journey})`);
        const journey = getKnownJourney(lookup.finding.journey);
        if (!journey) {
            console.error(`❌ Journey not found: ${lookup.finding.journey}`);
            return 1;
        }
        scenario = findingToSimulatorScenario(lookup.finding, journey);
        scenarioName = scenario.name;
    } else {
        const knownJourney = getKnownJourney(target);
        if (knownJourney) {
            console.log(`📋 Using known journey: ${target}`);
            scenario = journeyToSimulatorScenario(knownJourney);
            scenarioName = scenario.name;
        } else {
            console.log(`📋 Using built-in scenario: ${target}`);
            scenarioName = target;
            scenario = SCENARIOS[target];
            if (!scenario) {
                console.error(`❌ Built-in scenario not found: ${target}`);
                return 1;
            }
        }
    }

    if (headless) {
        return runSimulatorHeadless(scenarioName, scenario);
    }

    const videoPath = path.resolve(outputDir, `${scenarioName}-${Date.now()}.mp4`);

    try {
        const result = await runSimulatorMovie(scenarioName, videoPath, scenario);

        if (result.success) {
            console.log(`✅ Simulator regression completed successfully`);
            console.log(`🎥 Video recorded: ${result.videoPath}`);

            if (json) {
                console.log(JSON.stringify({ success: true, videoPath: result.videoPath, scenario: scenarioName }));
            }
            return 0;
        } else {
            console.error(`❌ Simulator regression failed: ${result.error}`);
            if (json) {
                console.log(JSON.stringify({ success: false, error: result.error, scenario: scenarioName }));
            }
            return 1;
        }
    } catch (error) {
        console.error(`❌ Simulator regression error:`, error);
        if (json) {
            console.log(JSON.stringify({ success: false, error: String(error), scenario: scenarioName }));
        }
        return 1;
    }
}

async function runSimulatorMovie(scenarioName: string, videoPath: string, customScenario: any = null): Promise<SimulatorResult> {
    const simulatorSrc = path.resolve(__dirname, '../../../simulator/src/index.ts');
    const simulatorDir = path.resolve(__dirname, '../../../simulator');

    if (customScenario) {
        const scenarioPath = path.resolve(simulatorDir, `tmp-${scenarioName}.js`);
        const scenarioCode = generateScenarioCode(customScenario);
        console.log(`📝 Generated scenario code:\n${scenarioCode}`);
        fs.writeFileSync(scenarioPath, scenarioCode);

        const args = [
            'tsx',
            simulatorSrc,
            '--movie',
            `--script=${scenarioPath}`,
            '--fps=2',
            '--width=1280',
            '--height=720',
            `--output-dir=${path.dirname(videoPath)}`,
        ];

        console.log(`🚀 Spawning: ${args.slice(0, 3).join(' ')} ...`);

        const child = spawn('npx', args, {
            cwd: simulatorDir,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            process.stdout.write(output);
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            process.stderr.write(output);
        });

        return new Promise((resolve) => {
            child.on('close', (code) => {
                try { fs.unlinkSync(scenarioPath); } catch {}
                if (code === 0) {
                    const files = fs.readdirSync(path.dirname(videoPath))
                        .filter((f: string) => f.startsWith(scenarioName) && f.endsWith('.mp4'))
                        .sort((a: string, b: string) => b.localeCompare(a));

                    if (files.length > 0) {
                        resolve({ success: true, videoPath: path.join(path.dirname(videoPath), files[0]) });
                    } else {
                        resolve({ success: false, error: 'No video file generated' });
                    }
                } else {
                    resolve({ success: false, error: `Process exited with code ${code}: ${stderr}` });
                }
            });

            child.on('error', (err) => {
                try { fs.unlinkSync(scenarioPath); } catch {}
                resolve({ success: false, error: `Failed to spawn process: ${err.message}` });
            });

            setTimeout(() => {
                child.kill('SIGTERM');
                try { fs.unlinkSync(scenarioPath); } catch {}
                resolve({ success: false, error: 'Timeout after 120 seconds' });
            }, 120000);
        });
    } else {
        const args = [
            'tsx',
            simulatorSrc,
            '--movie',
            `--scenario=${scenarioName}`,
            '--fps=2',
            '--width=1280',
            '--height=720',
            `--output-dir=${path.dirname(videoPath)}`,
        ];

        console.log(`🚀 Spawning: ${args.slice(0, 3).join(' ')} ...`);

        const child = spawn('npx', args, {
            cwd: simulatorDir,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            process.stdout.write(output);
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            process.stderr.write(output);
        });

        return new Promise((resolve) => {
            child.on('close', (code) => {
                if (code === 0) {
                    const files = fs.readdirSync(path.dirname(videoPath))
                        .filter((f: string) => f.startsWith(scenarioName) && f.endsWith('.mp4'))
                        .sort((a: string, b: string) => b.localeCompare(a));

                    if (files.length > 0) {
                        resolve({ success: true, videoPath: path.join(path.dirname(videoPath), files[0]) });
                    } else {
                        resolve({ success: false, error: 'No video file generated' });
                    }
                } else {
                    resolve({ success: false, error: `Process exited with code ${code}: ${stderr}` });
                }
            });

            child.on('error', (err) => {
                resolve({ success: false, error: `Failed to spawn process: ${err.message}` });
            });

            setTimeout(() => {
                child.kill('SIGTERM');
                resolve({ success: false, error: 'Timeout after 120 seconds' });
            }, 120000);
        });
    }
}

function generateScenarioCode(scenario: any): string {
    const propFn = `const prop = (key, operator, ...values) => ({ key, operator, values });`;

    const formatAgent = (agent: any): string => {
        const props = agent.properties.map((p: any) => `        prop('${p.key}', '${p.operator}', ${p.values.map((v: string) => `'${v}'`).join(', ')})`).join(',\n');
        const interests = agent.interests.map((p: any) => `        prop('${p.key}', '${p.operator}', ${p.values.map((v: string) => `'${v}'`).join(', ')})`).join(',\n');
        const traits = agent.traits.map((t: string) => `'${t}'`).join(', ');

        return `    {
        role: '${agent.role}',
        count: ${agent.count},
        properties: [
${props}
        ],
        interests: [
${interests}
        ],
        traits: [${traits}],
    }`;
    };

    const formatEvent = (event: any): string => {
        const parts = [`at: ${event.at}`, `action: '${event.action}'`, `actorRole: '${event.actorRole}'`];
        if (event.inputMethod) parts.push(`inputMethod: '${event.inputMethod}'`);
        if (event.targetAgentId) parts.push(`targetAgentId: '${event.targetAgentId}'`);
        if (event.cameraFocus) parts.push(`cameraFocus: '${event.cameraFocus}'`);
        return `    { ${parts.join(', ')} }`;
    };

    const agents = scenario.agents.map(formatAgent).join(',\n');
    const events = scenario.events.map(formatEvent).join(',\n');

    return `${propFn}\n\nconst scenario = {
    name: '${scenario.name}',
    description: '${scenario.description}',
    agents: [
${agents}
    ],
    events: [
${events}
    ],
    duration: ${scenario.duration},
};\n\nexport default scenario;\n`;
}

async function runSimulatorHeadless(scenarioName: string, scenario: any): Promise<number> {
    const simulatorSrc = path.resolve(__dirname, '../../../simulator/src/scenario.ts');
    const simulatorDir = path.resolve(__dirname, '../../../simulator');

    if (!scenario) {
        console.error(`❌ No scenario provided for headless mode`);
        return 1;
    }

    const scenarioPath = path.resolve(simulatorDir, `tmp-${scenarioName}.js`);
    const scenarioCode = generateScenarioCode(scenario);
    console.log(`📝 Generated scenario code:\n${scenarioCode}`);
    fs.writeFileSync(scenarioPath, scenarioCode);

    console.log(`🚀 Running headless scenario via tsx...`);

    const runnerCode = `
import { ScenarioRunner } from '@notention/simulator';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import scenario from '${scenarioPath.replace(/\\/g, '\\\\')}';

const relayUrl = 'ws://localhost:4444';

async function main() {
    const runner = new ScenarioRunner(relayUrl, DEFAULT_ONTOLOGY);
    try {
        await runner.run(scenario);
        console.log('✅ Headless scenario completed successfully');
        process.exit(0);
    } catch (e) {
        console.error('❌ Headless scenario failed:', e);
        process.exit(1);
    }
}

main();
`;

    const runnerPath = path.resolve(simulatorDir, `tmp-runner-${scenarioName}.js`);
    fs.writeFileSync(runnerPath, runnerCode);

    return new Promise((resolve) => {
        const child = spawn('npx', ['tsx', runnerPath], {
            cwd: simulatorDir,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            process.stdout.write(output);
        });

        child.stderr?.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            process.stderr.write(output);
        });

        child.on('close', (code) => {
            try { fs.unlinkSync(scenarioPath); } catch {}
            try { fs.unlinkSync(runnerPath); } catch {}
            if (code === 0) {
                console.log(`✅ Headless simulator regression completed successfully`);
                resolve(0);
            } else {
                console.error(`❌ Headless simulator regression failed: ${stderr}`);
                resolve(1);
            }
        });

        child.on('error', (err) => {
            try { fs.unlinkSync(scenarioPath); } catch {}
            try { fs.unlinkSync(runnerPath); } catch {}
            console.error(`❌ Headless simulator regression error: ${err.message}`);
            resolve(1);
        });

        setTimeout(() => {
            child.kill('SIGTERM');
            try { fs.unlinkSync(scenarioPath); } catch {}
            try { fs.unlinkSync(runnerPath); } catch {}
            console.error(`❌ Headless simulator regression timeout`);
            resolve(1);
        }, 120000);
    });
}