import { spawn, ChildProcess } from 'node:child_process';
import { fetch } from 'undici';
import {
    PREVIEW_START_TIMEOUT_MS,
    PREVIEW_POLL_INTERVAL_MS,
    PREVIEW_PORT_SEARCH_START,
    PREVIEW_PORT_SEARCH_RANGE,
} from '../constants.js';

let previewServerProcess: ChildProcess | null = null;
let previewServerUrl: string | null = null;
let previewServerPort: number | null = null;

async function getAvailablePort(startPort: number = PREVIEW_PORT_SEARCH_START): Promise<number> {
    const net = await import('node:net');
    for (let port = startPort; port < startPort + PREVIEW_PORT_SEARCH_RANGE; port++) {
        const available = await new Promise<boolean>((resolve) => {
            const server = net.createServer();
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close(() => resolve(true));
            });
            server.listen(port);
        });
        if (available) return port;
    }
    throw new Error('No available ports found');
}

function killPreviewServer(): void {
    if (previewServerProcess) {
        console.log(`   Killing preview server on port ${previewServerPort}`);
        previewServerProcess.kill('SIGTERM');
        previewServerProcess = null;
        previewServerUrl = null;
        previewServerPort = null;
    }
}

async function waitForServerReady(url: string, timeoutMs: number = PREVIEW_START_TIMEOUT_MS): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(url, { method: 'GET' });
            if (response.ok) return;
        } catch {
            // Wait and retry
        }
        await new Promise(resolve => setTimeout(resolve, PREVIEW_POLL_INTERVAL_MS));
    }
    throw new Error(`Dev server failed to start within ${timeoutMs / 1000} seconds`);
}

export interface PreviewServerConfig {
    port?: number;
    env?: Record<string, string>;
}

export interface PreviewServerResult {
    url: string;
    port: number;
    process: ChildProcess;
}

/**
 * Ensure preview server is running and return its URL
 */
export async function ensurePreviewServer(config: PreviewServerConfig = {}): Promise<string> {
    // Check if server is already running AND process is alive
    if (previewServerUrl && previewServerProcess && !previewServerProcess.killed) {
        try {
            const response = await fetch(previewServerUrl, { method: 'HEAD' });
            if (response.ok) {
                console.log(`   Preview server already running at ${previewServerUrl}`);
                return previewServerUrl;
            }
        } catch {
            // Server not responding, will start new one
            console.log(`   Preview server not responding, starting new one`);
        }
    }

    // Kill any existing process
    killPreviewServer();

    const port = config.port ?? await getAvailablePort();
    const url = `http://localhost:${port}`;
    console.log(`   Starting dev server at ${url}...`);

    const defaultEnv = {
        VITE_ENABLE_AGENT: 'false',
        VITE_LLM_SOURCE: 'none',
        VITE_DEV_HOOKS: 'true',
    };

    previewServerProcess = spawn('pnpm', ['--filter', '@notention/ui', 'dev', '--port', String(port), '--host', '0.0.0.0', '--strictPort'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ...defaultEnv, ...config.env },
    });
    previewServerPort = port;

    previewServerProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:')) {
            console.log(`   Preview server started`);
        }
    });

    previewServerProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        if (!output.includes('DEP0205') && !output.includes('ExperimentalWarning')) {
            console.error(`   Preview server error: ${output}`);
        }
    });

    // Handle process exit
    previewServerProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`   Preview server exited with code ${code}`);
        }
        previewServerProcess = null;
        previewServerUrl = null;
        previewServerPort = null;
    });

    await waitForServerReady(url);
    previewServerUrl = url;
    return url;
}

/**
 * Get the current preview server URL if running
 */
export function getPreviewServerUrl(): string | null {
    return previewServerUrl;
}

/**
 * Get the current preview server port if running
 */
export function getPreviewServerPort(): number | null {
    return previewServerPort;
}

/**
 * Check if preview server is running
 */
export function isPreviewServerRunning(): boolean {
    return previewServerProcess !== null && !previewServerProcess.killed && previewServerUrl !== null;
}

/**
 * Stop the preview server
 */
export function stopPreviewServer(): void {
    killPreviewServer();
}

/**
 * Restart the preview server
 */
export async function restartPreviewServer(config: PreviewServerConfig = {}): Promise<string> {
    killPreviewServer();
    return ensurePreviewServer(config);
}