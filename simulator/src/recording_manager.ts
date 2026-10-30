import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import chalk from 'chalk';
import { FILE_PATTERNS, SIMULATION_CONFIG } from './constants.js';

// Use system ffmpeg - ffmpeg-static binary not reliably available in pnpm
const ffmpegBinary = '/usr/bin/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegBinary);

export interface RecordingManagerOptions {
    outputDir: string;
    framerate: number;
    resolution: { width: number; height: number };
    deduplicateFrames?: boolean; // Skip identical consecutive frames
    onProgress?: (message: string) => void;
    onError?: (error: Error) => void;
}

export class RecordingManager {
    private recording = false;
    private cancelled = false;
    private frameCount = 0;
    private framesDir: string;
    private previousFrameHash: string | null = null;

    constructor(private readonly options: RecordingManagerOptions) {
        this.framesDir = path.join(this.options.outputDir, 'frames');
    }

    async startRecording(page: any): Promise<void> {
        this.cancelled = false;
        this.recording = true;
        this.frameCount = 0;
        this.previousFrameHash = null;

        if (fs.existsSync(this.framesDir)) {
            fs.rmSync(this.framesDir, { recursive: true, force: true });
        }
        fs.mkdirSync(this.framesDir, { recursive: true });

        this.log('🎥 Recording started...');

        const intervalMs = 1000 / this.options.framerate;
        const deduplicate = this.options.deduplicateFrames ?? true;

        // Run recording in background, don't await - stopRecording() will signal stop
        this.recordingPromise = (async () => {
            while (this.recording && !this.cancelled) {
                const start = Date.now();
                
                // Take screenshot as buffer for comparison
                const screenshotBuffer = await page.screenshot({ fullPage: true });
                
                // Check for duplicate frames if deduplication enabled
                if (deduplicate) {
                    const frameHash = crypto.createHash('md5').update(screenshotBuffer).digest('hex');
                    if (frameHash === this.previousFrameHash) {
                        // Skip duplicate frame
                        const duration = Date.now() - start;
                        await new Promise(r => setTimeout(r, Math.max(0, intervalMs - duration)));
                        continue;
                    }
                    this.previousFrameHash = frameHash;
                }

                const framePath = path.join(this.framesDir, FILE_PATTERNS.frameFile(this.frameCount));
                try {
                    fs.writeFileSync(framePath, screenshotBuffer);
                    this.frameCount++;
                } catch {
                    break;
                }

                const duration = Date.now() - start;
                await new Promise(r => setTimeout(r, Math.max(0, intervalMs - duration)));
            }
            this.log(`🎥 Recording finished. captured ${this.frameCount} frames.`);
        })();
    }

    private recordingPromise: Promise<void> | null = null;

    stopRecording(): void {
        this.recording = false;
    }

    async waitForRecording(): Promise<void> {
        if (this.recordingPromise) {
            await this.recordingPromise;
        }
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