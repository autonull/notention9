import { spawn, ChildProcess } from 'child_process';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { UI_SERVER_CONFIG } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface UIServerOptions {
    port: number;
    uiPath?: string;
    onReady?: () => void;
    onError?: (error: Error) => void;
}

export class UIServer {
    private process: ChildProcess | null = null;
    private readonly port: number;
    private readonly uiPath: string;
    private readonly onReady?: () => void;
    private readonly onError?: (error: Error) => void;

    constructor(options: UIServerOptions) {
        this.port = options.port;
        this.uiPath = options.uiPath ?? path.resolve(__dirname, '../../ui');
        this.onReady = options.onReady;
        this.onError = options.onError;
    }

    async start(): Promise<void> {
        if (!fs.existsSync(path.join(this.uiPath, 'node_modules')) &&
            !fs.existsSync(path.join(this.uiPath, '../../node_modules'))) {
            console.warn(chalk.yellow("Warning: node_modules not found in UI or root. UI server may fail."));
        }

        return new Promise<void>((resolve, reject) => {
            this.process = spawn('npm', ['run', 'dev', '--', '--host', '--port', String(this.port)], {
                cwd: this.uiPath,
                stdio: 'ignore',
                env: { ...process.env, VITE_PORT: String(this.port) }
            });

            const checkServer = async () => {
                try {
                    const res = await fetch(`http://localhost:${this.port}`);
                    if (res.ok) {
                        console.log(chalk.green("UI Server Ready."));
                        this.onReady?.();
                        resolve();
                        return;
                    }
                } catch {}
                setTimeout(checkServer, UI_SERVER_CONFIG.checkInterval);
            };
            checkServer();

            this.process.on('error', (err) => {
                const error = new Error(`Failed to start UI server: ${err.message}`);
                this.onError?.(error);
                reject(err);
            });
        });
    }

    stop(): void {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    get isRunning(): boolean {
        return this.process !== null && !this.process.killed;
    }
}

export async function startUIServer(port: number, uiPath?: string): Promise<UIServer> {
    const server = new UIServer({ port, uiPath });
    await server.start();
    return server;
}

export async function startStaticUIServer(port: number): Promise<UIServer> {
    const uiBuildDir = path.resolve(__dirname, '../dist/ui');
    if (!fs.existsSync(uiBuildDir)) {
        throw new Error(`UI build not found at ${uiBuildDir}. Run 'pnpm build' first.`);
    }

    const app = express();
    
    app.use(express.static(uiBuildDir));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).send('Not found');
        res.sendFile(path.join(uiBuildDir, 'index.html'));
    });

    return new Promise<UIServer>((resolve, reject) => {
        const server = app.listen(port, () => {
            console.log(chalk.green(`UI Server (static) Ready at http://localhost:${port}`));
            resolve({
                stop: () => server.close(),
                isRunning: true
            });
        });

        server.on('error', (err) => reject(err));
    });
}