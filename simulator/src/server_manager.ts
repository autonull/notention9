import { spawn, ChildProcess } from 'child_process';
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { LocalRelay } from './relay.js';
import { startDashboard, DashboardAgent } from './dashboard/server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerPorts {
    relay: number;
    dashboard: number;
    ui: number;
}

export class ServerManager {
    private relayServer: LocalRelay | null = null;
    private dashboardServer: http.Server | null = null;
    private uiProcess: ChildProcess | null = null;
    private ports: ServerPorts = { relay: 0, dashboard: 0, ui: 0 };
    private isShuttingDown = false;

    constructor() {}

    async start(agents: DashboardAgent[], requestedUiPort: number = 5173): Promise<ServerPorts> {
        // 1. Find Ports
        this.ports.relay = await this.findFreePort(4444);
        this.ports.dashboard = await this.findFreePort(8000);
        this.ports.ui = await this.findFreePort(requestedUiPort);

        console.log(chalk.gray(`Selected Ports - Relay: ${this.ports.relay}, Dashboard: ${this.ports.dashboard}, UI: ${this.ports.ui}`));

        // 2. Start Relay
        this.relayServer = new LocalRelay(this.ports.relay);

        // 3. Start Dashboard
        this.dashboardServer = startDashboard(this.ports.dashboard, this.ports.ui, agents);

        // 4. Start UI Server
        await this.startUIServer();

        // Handle Shutdown
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        process.on('exit', () => this.shutdown());

        return this.ports;
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        console.log(chalk.yellow("\n🛑 Shutting down servers..."));

        if (this.relayServer) this.relayServer.stop();
        if (this.dashboardServer) this.dashboardServer.close();
        if (this.uiProcess) {
            this.uiProcess.kill();
            // Give it a moment to die
            try { process.kill(this.uiProcess.pid!, 'SIGKILL'); } catch (e) {}
        }
    }

    private async startUIServer(): Promise<void> {
        console.log(chalk.yellow("Starting UI Server (Vite)..."));

        // We assume we are in simulator/src, so ui is at ../../ui
        const uiPath = path.resolve(__dirname, '../../ui');

        if (!fs.existsSync(path.join(uiPath, 'node_modules')) && !fs.existsSync(path.join(uiPath, '../../node_modules'))) {
             console.warn(chalk.yellow("Warning: node_modules not found in UI or root. UI server may fail."));
        }

        return new Promise<void>((resolve, reject) => {
            // Check if UI is already running on the port (e.g., user ran npm run dev manually)
            // But since we selected a free port, we assume we need to start it unless the user forced a specific port?
            // To keep it simple and robust: we always start our own instance on our own port.

            this.uiProcess = spawn('npm', ['run', 'dev', '--', '--host', '--port', String(this.ports.ui)], {
                cwd: uiPath,
                stdio: 'ignore', // 'inherit' for debugging
                env: { ...process.env, VITE_PORT: String(this.ports.ui) }
            });

            // Poll for server readiness
            const checkServer = async () => {
                if (this.isShuttingDown) return;
                try {
                    const res = await fetch(`http://localhost:${this.ports.ui}`);
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

    private findFreePort(startPort: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.unref();
            server.on('error', () => {
                // Port in use, try next one
                this.findFreePort(startPort + 1).then(resolve, reject);
            });
            server.listen(startPort, () => {
                const port = (server.address() as net.AddressInfo).port;
                server.close(() => {
                    resolve(port);
                });
            });
        });
    }

    get relayUrl() {
        return `ws://localhost:${this.ports.relay}`;
    }
}
