import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import chalk from 'chalk';
import { FILE_PATTERNS, SIMULATION_CONFIG } from './constants.js';

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

export interface RecordingManagerOptions {
    outputDir: string;
    framerate: number;
    resolution: { width: number; height: number };
    onProgress?: (message: string) => void;
    onError?: (error: Error) => void;
}

export class RecordingManager {
    private recording = false;
    private cancelled = false;
    private frameCount = 0;
    private framesDir: string;

    constructor(private readonly options: RecordingManagerOptions) {
        this.framesDir = path.join(this.options.outputDir, 'frames');
    }

    async startRecording(page: any): Promise<void> {
        this.cancelled = false;
        this.recording = true;
        this.frameCount = 0;

        if (fs.existsSync(this.framesDir)) {
            fs.rmSync(this.framesDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.framesDir, { recursive: true });

        this.log('🎥 Recording started...');

        const intervalMs = 1000 / this.options.framerate;

        const recordingPromise = (async () => {
            while (this.recording && !this.cancelled) {
                const start = Date.now();
                const framePath = path.join(this.framesDir, FILE_PATTERNS.frameFile(this.frameCount));
                try {
                    await page.screenshot({ path: framePath, fullPage: true });
                    this.frameCount++;
                } catch {
                    break;
                }

                const duration = Date.now() - start;
                await new Promise(r => setTimeout(r, Math.max(0, intervalMs - duration)));
            }
        })();

        await recordingPromise;
        this.log(`🎥 Recording finished. captured ${this.frameCount} frames.`);
    }

    stopRecording(): void {
        this.recording = false;
    }

    cancel(): void {
        this.cancelled = true;
        this.recording = false;
        this.log('Cancellation requested...');
    }

    async encodeVideo(): Promise<void> {
        if (this.cancelled) return;

        this.log('Encoding Video...');
        const outputPath = path.join(this.options.outputDir, 'simulation.mp4');

        return new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(path.join(this.framesDir, FILE_PATTERNS.frame))
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

    getFrameCount(): number {
        return this.frameCount;
    }

    isRecording(): boolean {
        return this.recording;
    }

    isCancelled(): boolean {
        return this.cancelled;
    }

    private log(message: string) {
        this.options.onProgress?.(message) ?? console.log(chalk.blue(`[RecordingManager] ${message}`));
    }

    private error(err: Error) {
        this.options.onError?.(err) ?? console.error(chalk.red(`[RecordingManager Error]`), err);
    }
}