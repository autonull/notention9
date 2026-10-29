import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SimulatorResult {
    success: boolean;
    videoPath?: string;
    error?: string;
}

export async function runSimulatorRegression(scenarioName: string, json: boolean): Promise<number> {
    const simulatorDir = path.resolve(__dirname, '../../../simulator');
    const outputDir = path.resolve(simulatorDir, 'movies');
    const videoPath = path.resolve(outputDir, `${scenarioName}-${Date.now()}.mp4`);

    console.log(`🎬 Starting simulator regression for scenario: ${scenarioName}`);
    console.log(`📁 Output directory: ${outputDir}`);

    try {
        const result = await runSimulatorMovie(scenarioName, videoPath);

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

function runSimulatorMovie(scenarioName: string, videoPath: string): Promise<SimulatorResult> {
    return new Promise((resolve) => {
        const simulatorDist = path.resolve(__dirname, '../../../simulator/dist/index.js');

        const args = [
            simulatorDist,
            '--movie',
            `--scenario=${scenarioName}`,
            '--fps=2',
            '--width=1280',
            '--height=720',
            `--output-dir=${path.dirname(videoPath)}`,
        ];

        console.log(`🚀 Spawning: node ${args.join(' ')}`);

        const child = spawn('node', args, {
            cwd: path.dirname(simulatorDist),
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
            if (code === 0) {
                // Find the generated video file
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

        // Timeout after 2 minutes
        setTimeout(() => {
            child.kill('SIGTERM');
            resolve({ success: false, error: 'Timeout after 120 seconds' });
        }, 120000);
    });
}