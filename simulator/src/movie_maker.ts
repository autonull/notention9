import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Scenario, ScenarioRunner } from './scenario.js';
import { startDashboard } from './dashboard/server.js';
import { Agent } from './agent.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface MovieOptions {
    framerate: number;
    resolution: { width: number; height: number };
    uiPort: number;
    dashboardPort: number;
    outputDir: string;
}

export class MovieMaker {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private uiProcess: ChildProcess | null = null;
    private dashboardServer: any | null = null;
    private runner: ScenarioRunner | null = null;

    constructor(
        private readonly relayUrl: string,
        private readonly options: MovieOptions
    ) {}

    async start(scenario: Scenario) {
        console.log(chalk.bold.magenta("\n🎬 Starting Movie Maker Mode 🎬\n"));

        // 1. Start UI Server
        await this.startUIServer();

        // 2. Prepare Scenario (Spawn Agents)
        this.runner = new ScenarioRunner(this.relayUrl, DEFAULT_ONTOLOGY);
        await this.runner.prepare(scenario);

        // 3. Start Dashboard Server
        const agents = this.runner.agents.map(a => ({
            id: a.id,
            name: a.profile.name,
            role: a.profile.role
        }));
        this.dashboardServer = startDashboard(this.options.dashboardPort, this.options.uiPort, agents);

        // 4. Setup Browser & Agents
        await this.setupBrowser(this.runner.agents);

        // 5. Start Recording & Simulation
        await this.recordAndRun(scenario);

        // 6. Cleanup & Encode
        await this.cleanup();
    }

    private async startUIServer() {
        console.log(chalk.yellow("Starting UI Server (Vite)..."));

        // We assume we are in simulator/src, so ui is at ../../ui
        const uiPath = path.resolve(__dirname, '../../ui');

        // Check if node_modules exists in ui or root (hoisting)
        // If not found, we warn but proceed, relying on npm run dev to fail if critical deps missing.
        if (!fs.existsSync(path.join(uiPath, 'node_modules')) && !fs.existsSync(path.join(uiPath, '../../node_modules'))) {
             console.warn(chalk.yellow("Warning: node_modules not found in UI or root. UI server may fail."));
        }

        return new Promise<void>((resolve, reject) => {
            this.uiProcess = spawn('npm', ['run', 'dev', '--', '--host', '--port', String(this.options.uiPort)], {
                cwd: uiPath,
                stdio: 'ignore', // 'inherit' for debugging
                env: { ...process.env, VITE_PORT: String(this.options.uiPort) }
            });

            // Poll for server readiness
            const checkServer = async () => {
                try {
                    const res = await fetch(`http://localhost:${this.options.uiPort}`);
                    if (res.ok) {
                        console.log(chalk.green("UI Server Ready."));
                        resolve();
                        return;
                    }
                } catch (e) {}
                setTimeout(checkServer, 1000);
            };
            checkServer();

            this.uiProcess.on('error', (err) => {
                console.error("Failed to start UI server:", err);
                reject(err);
            });
        });
    }

    private async setupBrowser(agents: Agent[]) {
        console.log(chalk.yellow("Launching Browser..."));
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            viewport: this.options.resolution,
            bypassCSP: true,
            ignoreHTTPSErrors: true
        });

        // Inject Identity for each agent
        console.log(chalk.yellow(`Configuring ${agents.length} agent sessions...`));

        // Using a single page to configure sessions sequentially
        const page = await this.context.newPage();

        for (const agent of agents) {
            const url = `http://${agent.id}.lvh.me:${this.options.uiPort}`;

            try {
                // Navigate to trigger DB creation
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                // Inject settings into IndexedDB (localforage default)
                await page.evaluate(async (data) => {
                    const { key, relayUrl } = data;

                    const settings = {
                        aiEnabled: false,
                        developerMode: false,
                        theme: 'dark',
                        nostr: {
                            privkey: key,
                            relays: [relayUrl]
                        },
                        ontology: []
                    };

                    return new Promise<void>((resolve, reject) => {
                        const request = indexedDB.open('localforage');
                        request.onerror = () => reject(request.error);
                        request.onupgradeneeded = (e: any) => {
                            const db = e.target.result;
                            db.createObjectStore('keyvaluepairs');
                        };
                        request.onsuccess = (e: any) => {
                            const db = e.target.result;
                            const tx = db.transaction(['keyvaluepairs'], 'readwrite');
                            const store = tx.objectStore('keyvaluepairs');
                            // key is 'notention-settings-v2' as defined in ui/src/components/contexts/SettingsContext.tsx
                            const putReq = store.put(settings, 'notention-settings-v2');
                            putReq.onsuccess = () => resolve();
                            putReq.onerror = () => reject(putReq.error);
                        };
                    });
                }, { key: agent.secretKey, relayUrl: this.relayUrl });

                // console.log(`Configured ${agent.profile.name} at ${url}`);
            } catch (e) {
                console.error(chalk.red(`Failed to configure agent ${agent.profile.name}:`), e);
            }
        }

        await page.close();
    }

    private async recordAndRun(scenario: Scenario) {
        if (!this.context || !this.runner) return;

        console.log(chalk.yellow("Starting Dashboard & Recording..."));
        const page = await this.context.newPage();
        const dashboardUrl = `http://localhost:${this.options.dashboardPort}`;
        await page.goto(dashboardUrl, { waitUntil: 'networkidle' });

        // Ensure output directory exists
        const framesDir = path.join(this.options.outputDir, 'frames');
        if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
        fs.mkdirSync(framesDir, { recursive: true });

        console.log(chalk.green("🎥 Recording started..."));

        const intervalMs = 1000 / this.options.framerate;
        let frameCount = 0;
        let recording = true;

        // Start Recording Loop
        const recordingPromise = (async () => {
            while (recording) {
                const start = Date.now();
                const framePath = path.join(framesDir, `frame_${String(frameCount).padStart(5, '0')}.png`);
                try {
                    await page.screenshot({ path: framePath, fullPage: true });
                    frameCount++;
                } catch (e) {
                    // Page might be closed
                    break;
                }
                const duration = Date.now() - start;
                const delay = Math.max(0, intervalMs - duration);
                await new Promise(r => setTimeout(r, delay));
            }
        })();

        // Start Simulation Execution
        console.log(chalk.cyan("Starting Simulation Execution..."));
        await this.runner.execute(scenario);

        // Allow a few seconds for final states to settle
        await new Promise(r => setTimeout(r, 2000));

        recording = false;
        await recordingPromise;
        console.log(chalk.green(`🎥 Recording finished. captured ${frameCount} frames.`));

        // Encode
        await this.encodeVideo(framesDir, frameCount);
    }

    private async encodeVideo(framesDir: string, frameCount: number) {
        console.log(chalk.yellow("Encoding Video..."));
        const outputPath = path.join(this.options.outputDir, 'simulation.mp4');

        return new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(path.join(framesDir, 'frame_%05d.png'))
                .inputFPS(this.options.framerate)
                .output(outputPath)
                .videoCodec('libx264')
                .outputOptions('-pix_fmt yuv420p')
                .on('end', () => {
                    console.log(chalk.green(`\n✅ Video saved to: ${outputPath}`));
                    resolve();
                })
                .on('error', (err) => {
                    console.error("FFmpeg error:", err);
                    reject(err);
                })
                .run();
        });
    }

    private async cleanup() {
        console.log(chalk.yellow("Cleaning up..."));
        if (this.browser) await this.browser.close();
        if (this.dashboardServer) this.dashboardServer.close();
        if (this.uiProcess) {
            this.uiProcess.kill();
        }
    }
}
