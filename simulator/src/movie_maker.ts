import { Scenario, ScenarioRunner } from './scenario.js';
import { Agent } from './agent.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { UIServer } from './ui_server.js';
import { SIMULATION_CONFIG } from './constants.js';
import { BrowserManager } from './browser_manager.js';
import { RecordingManager } from './recording_manager.js';
import { DashboardManager } from './dashboard_manager.js';

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
    private uiServer: UIServer | null = null;
    private runner: ScenarioRunner | null = null;
    private browserManager: BrowserManager | null = null;
    private recordingManager: RecordingManager | null = null;
    private dashboardManager: DashboardManager | null = null;
    private cancelled = false;

    constructor(
        private readonly relayUrl: string,
        private readonly options: MovieOptions
    ) {}

    private log(message: string) {
        this.options.onProgress?.(message) ?? console.log(`[MovieMaker] ${message}`);
    }

    private error(err: Error) {
        this.options.onError?.(err) ?? console.error(`[MovieMaker Error]`, err);
    }

    async cancel() {
        this.cancelled = true;
        this.recordingManager?.cancel();
        this.log('Cancellation requested...');
        if (this.uiServer) this.uiServer.stop();
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

            this.dashboardManager = new DashboardManager({
                dashboardPort: this.options.dashboardPort,
                uiPort: this.options.uiPort,
                relayUrl: this.relayUrl,
                onProgress: this.options.onProgress,
                onError: this.options.onError
            });
            this.dashboardManager.start(this.runner.agents);

            if (this.cancelled) return;

            this.browserManager = new BrowserManager({
                resolution: this.options.resolution,
                uiPort: this.options.uiPort,
                relayUrl: this.relayUrl
            });
            await this.browserManager.start();
            await this.browserManager.configureAgents(this.runner.agents);

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
        this.log('Starting UI Server (Vite)...');
        this.uiServer = new UIServer({ port: this.options.uiPort });
        await this.uiServer.start();
    }

    private async recordAndRun(scenario: Scenario) {
        if (!this.browserManager || !this.runner) return;

        this.log('Starting Dashboard & Recording...');
        const page = await this.browserManager.createPage('recording');
        await this.browserManager.navigateToDashboard(page, this.options.dashboardPort, this.options.view);

        this.recordingManager = new RecordingManager({
            outputDir: this.options.outputDir,
            framerate: this.options.framerate,
            resolution: this.options.resolution,
            onProgress: this.options.onProgress,
            onError: this.options.onError
        });

        await this.recordingManager.startRecording(page);

        this.log('Starting Simulation Execution...');
        this.runner.onEvent = (event) => {
            if (event.action === 'camera' && event.cameraFocus) {
                let targetId = event.cameraFocus;
                if (targetId !== 'grid') {
                    const agent = this.runner?.agents.find(a => a.profile.name === targetId || a.id === targetId);
                    if (agent) targetId = agent.id;
                }
                page.evaluate((focusId: string) => (window as any).setCameraFocus?.(focusId), targetId).catch(() => {});
            }
        };
        
        this.runner.runEventSink = (runEvent) => {
            this.log(`[RunEvent] ${runEvent.type}: ${JSON.stringify(runEvent.data)}`);
        };

        if (this.runner) await this.runner.execute(scenario);
        await new Promise(r => setTimeout(r, SIMULATION_CONFIG.postSimulationDelay));

        this.recordingManager.stopRecording();
        this.log(`🎥 Recording finished. captured ${this.recordingManager.getFrameCount()} frames.`);

        if (!this.cancelled) await this.recordingManager.encodeVideo();
    }

    private async cleanup() {
        this.log('Cleaning up...');
        this.browserManager?.cleanup();
        this.dashboardManager?.stop();
        if (this.uiServer) this.uiServer.stop();
        this.browserManager = null;
        this.dashboardManager = null;
        this.uiServer = null;
        this.recordingManager = null;
    }
}
