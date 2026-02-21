import { chromium, Browser, BrowserContext } from 'playwright';
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
    ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

export interface MovieOptions {
    framerate: number;
    resolution: { width: number; height: number };
    uiPort: number;
    dashboardPort: number;
    outputDir: string;
    view?: 'dashboard' | 'ontology';
    skipUiServer?: boolean;
    onProgress?: (message: string) => void;
    onError?: (error: Error) => void;
}

export class MovieMaker {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private uiProcess: ChildProcess | null = null;
    private dashboardServer: any | null = null;
    private runner: ScenarioRunner | null = null;
    private recording: boolean = false;
    private cancelled: boolean = false;

    constructor(
        private readonly relayUrl: string,
        private readonly options: MovieOptions
    ) {}

    private log(message: string) {
        this.options.onProgress?.(message) ?? console.log(chalk.blue(`[MovieMaker] ${message}`));
    }

    private error(err: Error) {
        this.options.onError?.(err) ?? console.error(chalk.red(`[MovieMaker Error]`), err);
    }

    async cancel() {
        this.cancelled = true;
        this.recording = false;
        this.log("Cancellation requested...");
        await this.cleanup();
    }

    async start(scenario: Scenario) {
        this.cancelled = false;
        this.log(`Starting movie generation for scenario: ${scenario.name}`);

        try {
            if (!this.options.skipUiServer) await this.startUIServer();
            if (this.cancelled) return;

            this.runner = new ScenarioRunner(this.relayUrl, DEFAULT_ONTOLOGY);
            await this.runner.prepare(scenario);
            if (this.cancelled) return;

            const agents = this.runner.agents.map(a => ({
                id: a.id,
                name: a.profile.name,
                role: a.profile.role
            }));
            this.dashboardServer = startDashboard(this.options.dashboardPort, this.options.uiPort, agents);
            this.log(`Dashboard server started on port ${this.options.dashboardPort}`);

            if (this.cancelled) return;

            await this.setupBrowser(this.runner.agents);
            if (this.cancelled) return;

            await this.recordAndRun(scenario);
            if (this.cancelled) return;

            await this.cleanup();
        } catch (e) {
            this.error(e instanceof Error ? e : new Error(String(e)));
            await this.cleanup();
            throw e;
        }
    }

    private async startUIServer() {
        this.log("Starting UI Server (Vite)...");
        const uiPath = path.resolve(__dirname, '../../ui');

        if (!fs.existsSync(path.join(uiPath, 'node_modules')) && !fs.existsSync(path.join(uiPath, '../../node_modules'))) {
             console.warn(chalk.yellow("Warning: node_modules not found in UI or root. UI server may fail."));
        }

        return new Promise<void>((resolve, reject) => {
            this.uiProcess = spawn('npm', ['run', 'dev', '--', '--host', '--port', String(this.options.uiPort)], {
                cwd: uiPath,
                stdio: 'ignore',
                env: { ...process.env, VITE_PORT: String(this.options.uiPort) }
            });

            const checkServer = async () => {
                if (this.cancelled) {
                    reject(new Error("Cancelled"));
                    return;
                }
                try {
                    const res = await fetch(`http://localhost:${this.options.uiPort}`);
                    if (res.ok) {
                        this.log("UI Server Ready.");
                        resolve();
                        return;
                    }
                } catch {}
                setTimeout(checkServer, 1000);
            };
            checkServer();

            this.uiProcess.on('error', (err) => {
                this.error(new Error(`Failed to start UI server: ${err.message}`));
                reject(err);
            });
        });
    }

    private async setupBrowser(agents: Agent[]) {
        this.log("Launching Browser...");
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            viewport: this.options.resolution,
            bypassCSP: true,
            ignoreHTTPSErrors: true
        });

        this.log(`Configuring ${agents.length} agent sessions...`);
        const page = await this.context.newPage();

        for (const agent of agents) {
            if (this.cancelled) break;
            const url = `http://${agent.id}.lvh.me:${this.options.uiPort}`;

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.evaluate(async (data) => {
                    const { key, relayUrl } = data;
                    const settings = {
                        aiEnabled: false,
                        developerMode: false,
                        theme: 'dark',
                        nostr: { privkey: key, relays: [relayUrl] },
                        ontology: []
                    };
                    return new Promise<void>((resolve, reject) => {
                        const request = indexedDB.open('localforage');
                        request.onerror = () => reject(request.error);
                        request.onupgradeneeded = (e: any) => {
                            e.target.result.createObjectStore('keyvaluepairs');
                        };
                        request.onsuccess = (e: any) => {
                            const store = e.target.result.transaction(['keyvaluepairs'], 'readwrite').objectStore('keyvaluepairs');
                            const putReq = store.put(settings, 'notention-settings-v2');
                            putReq.onsuccess = () => resolve();
                            putReq.onerror = () => reject(putReq.error);
                        };
                    });
                }, { key: agent.secretKey, relayUrl: this.relayUrl });

            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                this.error(new Error(`Failed to configure agent ${agent.profile.name}: ${message}`));
            }
        }
        await page.close();
    }

    private async recordAndRun(scenario: Scenario) {
        if (!this.context || !this.runner) return;

        this.log("Starting Dashboard & Recording...");
        const page = await this.context.newPage();
        const url = `http://localhost:${this.options.dashboardPort}${this.options.view === 'ontology' ? '/ontology' : ''}`;

        await page.goto(url, { waitUntil: 'networkidle' });

        const framesDir = path.join(this.options.outputDir, 'frames');
        if (fs.existsSync(framesDir)) fs.rmSync(framesDir, { recursive: true, force: true });
        fs.mkdirSync(framesDir, { recursive: true });

        this.log("🎥 Recording started...");

        const intervalMs = 1000 / this.options.framerate;
        let frameCount = 0;
        this.recording = true;

        const recordingPromise = (async () => {
            while (this.recording && !this.cancelled) {
                const start = Date.now();
                const framePath = path.join(framesDir, `frame_${String(frameCount).padStart(5, '0')}.png`);
                try {
                    await page.screenshot({ path: framePath, fullPage: true });
                    frameCount++;
                } catch { break; }

                const duration = Date.now() - start;
                await new Promise(r => setTimeout(r, Math.max(0, intervalMs - duration)));
            }
        })();

        this.log("Starting Simulation Execution...");
        this.runner.onEvent = (event) => {
            if (event.action === 'camera' && event.cameraFocus) {
                let targetId = event.cameraFocus;
                if (targetId !== 'grid') {
                     const agent = this.runner?.agents.find(a => a.profile.name === targetId || a.id === targetId);
                     if (agent) targetId = agent.id;
                }
                // @ts-ignore
                page.evaluate((focusId) => window.setCameraFocus && window.setCameraFocus(focusId), targetId).catch(() => {});
            }
        };

        if (this.runner) await this.runner.execute(scenario);
        await new Promise(r => setTimeout(r, 2000));

        this.recording = false;
        await recordingPromise;
        this.log(`🎥 Recording finished. captured ${frameCount} frames.`);

        if (!this.cancelled) await this.encodeVideo(framesDir, frameCount);
    }

    private async encodeVideo(framesDir: string, frameCount: number) {
        this.log("Encoding Video...");
        const outputPath = path.join(this.options.outputDir, 'simulation.mp4');

        return new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(path.join(framesDir, 'frame_%05d.png'))
                .inputFPS(this.options.framerate)
                .output(outputPath)
                .videoCodec('libx264')
                .outputOptions('-pix_fmt yuv420p')
                .on('end', () => {
                    this.log(`✅ Video saved to: ${outputPath}`);
                    resolve();
                })
                .on('error', (err) => {
                    this.error(new Error(`FFmpeg error: ${err}`));
                    reject(err);
                })
                .run();
        });
    }

    private async cleanup() {
        this.log("Cleaning up...");
        if (this.browser) await this.browser.close();
        if (this.dashboardServer) this.dashboardServer.close();
        if (this.uiProcess) this.uiProcess.kill();
        this.browser = null;
        this.dashboardServer = null;
        this.uiProcess = null;
    }
}
