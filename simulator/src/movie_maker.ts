import { Scenario, ScenarioRunner, EventConfig } from './scenario.js';
import { Agent } from './agent.js';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { UIServer } from './ui_server.js';
import { SIMULATION_CONFIG } from './constants.js';
import { BrowserManager } from './browser_manager.js';
import { RecordingManager } from './recording_manager.js';
import { DashboardManager } from './dashboard_manager.js';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CaptionEntry {
    startTime: number;  // seconds
    endTime: number;    // seconds
    text: string;
}

export interface NarrationEntry {
    startTime: number;  // seconds
    text: string;
    audioPath?: string; // pre-recorded audio file
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
    // New options for S4
    enableCaptions?: boolean;
    enableNarration?: boolean;
    narrationVoice?: string; // TTS voice identifier
    captionFontSize?: number;
    captionColor?: string;
    captionBackground?: string;
}

const DEFAULT_CAPTION_OPTIONS = {
    enableCaptions: true,
    enableNarration: false,
    narrationVoice: 'default',
    captionFontSize: 24,
    captionColor: 'white',
    captionBackground: 'rgba(0, 0, 0, 0.7)',
};

export class MovieMaker {
    private uiServer: UIServer | null = null;
    private runner: ScenarioRunner | null = null;
    private browserManager: BrowserManager | null = null;
    private recordingManager: RecordingManager | null = null;
    private dashboardManager: DashboardManager | null = null;
    private cancelled = false;
    private captions: CaptionEntry[] = [];
    private narration: NarrationEntry[] = [];

    constructor(
        private readonly relayUrl: string,
        private readonly options: MovieOptions
    ) {
        this.options = { ...DEFAULT_CAPTION_OPTIONS, ...options };
    }

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

            // Generate captions from scenario events
            if (this.options.enableCaptions) {
                this.captions = this.generateCaptions(scenario);
                this.saveCaptions();
            }

            // Generate narration if enabled
            if (this.options.enableNarration) {
                this.narration = await this.generateNarration(scenario);
            }

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
                relayUrl: this.relayUrl,
                ontology: DEFAULT_ONTOLOGY
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

    private generateCaptions(scenario: Scenario): CaptionEntry[] {
        const captions: CaptionEntry[] = [];
        let currentTime = 0;

        // Add title caption
        captions.push({
            startTime: 0,
            endTime: 3,
            text: scenario.name,
        });
        currentTime = 3;

        // Add description caption
        captions.push({
            startTime: currentTime,
            endTime: currentTime + 4,
            text: scenario.description,
        });
        currentTime += 4;

        // Generate captions from events
        for (const event of scenario.events) {
            const eventCaption = this.eventToCaption(event, currentTime);
            if (eventCaption) {
                captions.push(eventCaption);
                currentTime = eventCaption.endTime;
            }
        }

        // Add closing caption
        captions.push({
            startTime: currentTime,
            endTime: currentTime + 3,
            text: 'Simulation complete',
        });

        return captions;
    }

    private eventToCaption(event: EventConfig, currentTime: number): CaptionEntry | null {
        const duration = 3; // seconds per event caption
        let text = '';

        switch (event.action) {
            case 'publish_job':
                text = `${event.actorRole} publishes a job request`;
                break;
            case 'publish_offer':
                text = `${event.actorRole} publishes an offer`;
                break;
            case 'camera':
                if (event.cameraFocus === 'grid') {
                    text = 'Viewing all matches';
                } else {
                    text = `Focusing on ${event.cameraFocus}`;
                }
                break;
            default:
                text = `${event.actorRole} performs ${event.action}`;
        }

        if (!text) return null;

        return {
            startTime: currentTime,
            endTime: currentTime + duration,
            text,
        };
    }

    private async generateNarration(scenario: Scenario): Promise<NarrationEntry[]> {
        // For now, create narration entries matching captions
        // In the future, this could use TTS to generate audio files
        const narration: NarrationEntry[] = [];
        
        for (const caption of this.captions) {
            narration.push({
                startTime: caption.startTime,
                text: caption.text,
            });
        }

        // Save narration script for potential TTS generation
        const narrationScript = narration.map(n => 
            `[${n.startTime.toFixed(1)}s] ${n.text}`
        ).join('\n');
        
        writeFileSync(join(this.options.outputDir, 'narration.txt'), narrationScript);
        this.log(`📝 Narration script saved to ${this.options.outputDir}/narration.txt`);

        return narration;
    }

    private saveCaptions(): void {
        // Save as WebVTT format
        const vttContent = this.captionsToVTT(this.captions);
        writeFileSync(join(this.options.outputDir, 'captions.vtt'), vttContent);
        this.log(`📝 Captions saved to ${this.options.outputDir}/captions.vtt`);

        // Also save as SRT format
        const srtContent = this.captionsToSRT(this.captions);
        writeFileSync(join(this.options.outputDir, 'captions.srt'), srtContent);
        this.log(`📝 Captions saved to ${this.options.outputDir}/captions.srt`);
    }

    private captionsToVTT(captions: CaptionEntry[]): string {
        let vtt = 'WEBVTT\n\n';
        for (const caption of captions) {
            const start = this.formatTimeVTT(caption.startTime);
            const end = this.formatTimeVTT(caption.endTime);
            vtt += `${start} --> ${end}\n${caption.text}\n\n`;
        }
        return vtt;
    }

    private captionsToSRT(captions: CaptionEntry[]): string {
        let srt = '';
        for (let i = 0; i < captions.length; i++) {
            const caption = captions[i];
            const start = this.formatTimeSRT(caption.startTime);
            const end = this.formatTimeSRT(caption.endTime);
            srt += `${i + 1}\n${start} --> ${end}\n${caption.text}\n\n`;
        }
        return srt;
    }

    private formatTimeVTT(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    private formatTimeSRT(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
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
        await this.recordingManager.waitForRecording();
        this.log(`🎥 Recording finished. captured ${this.recordingManager.getFrameCount()} frames.`);

        if (!this.cancelled) {
            await this.recordingManager.encodeVideo();
            
            // If captions enabled, burn them into the video
            if (this.options.enableCaptions && this.captions.length > 0) {
                await this.burnCaptions();
            }
        }
    }

    private async burnCaptions(): Promise<void> {
        const inputPath = join(this.options.outputDir, 'simulation.mp4');
        const outputPath = join(this.options.outputDir, 'simulation-captioned.mp4');
        
        if (!existsSync(inputPath)) {
            this.log('⚠️ Video file not found, skipping caption burn');
            return;
        }

        this.log('🔥 Burning captions into video...');

        // Create ASS subtitle file for better styling
        const assContent = this.captionsToASS(this.captions);
        const assPath = join(this.options.outputDir, 'captions.ass');
        writeFileSync(assPath, assContent);

        return new Promise<void>((resolve, reject) => {
            const ffmpeg = await import('fluent-ffmpeg');
            const ffmpegPath = await import('ffmpeg-static');
            
            ffmpeg.default.setFfmpegPath(ffmpegPath.default || '/usr/bin/ffmpeg');
            
            ffmpeg.default(inputPath)
                .input(assPath)
                .outputOptions([
                    '-vf', `ass=${assPath.replace(/\\/g, '\\\\')}`,
                    '-c:a', 'copy'
                ])
                .output(outputPath)
                .on('end', () => {
                    this.log(`✅ Captioned video saved to: ${outputPath}`);
                    // Replace original with captioned version
                    import('fs').then(fs => {
                        fs.renameSync(outputPath, inputPath);
                        this.log('✅ Original video replaced with captioned version');
                    });
                    resolve();
                })
                .on('error', (err: Error) => {
                    this.error(new Error(`FFmpeg caption burn error: ${err.message}`));
                    // Don't fail the whole process, just log the error
                    resolve();
                })
                .run();
        });
    }

    private captionsToASS(captions: CaptionEntry[]): string {
        const fontSize = this.options.captionFontSize ?? 24;
        const color = this.options.captionColor ?? 'white';
        const background = this.options.captionBackground ?? 'rgba(0, 0, 0, 0.7)';
        
        // Convert color to ASS format
        const assColor = color === 'white' ? '&HFFFFFF' : '&H000000';
        
        let ass = `[Script Info]
Title: Notention Showcase Captions
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: ${this.options.resolution.width}
PlayResY: ${this.options.resolution.height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},${assColor},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

        for (const caption of captions) {
            const start = this.formatTimeASS(caption.startTime);
            const end = this.formatTimeASS(caption.endTime);
            ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${caption.text}\n`;
        }

        return ass;
    }

    private formatTimeASS(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const cs = Math.floor((seconds % 1) * 100); // centiseconds for ASS
        return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
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
