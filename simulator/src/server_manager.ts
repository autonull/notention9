import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { default as chalk } from 'chalk';
import { NostrRelay } from '@notention/core';
import { startDashboard, DashboardAgent } from './dashboard/server.js';
import { UIServer } from './ui_server.js';
import { DEFAULT_PORTS } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerPorts {
    relay: number;
    dashboard: number;
    ui: number;
}

export interface ServerManagerOptions {
    startUiServer?: boolean;
}

export class ServerManager {
    private relayServer: NostrRelay | null = null;
    private dashboardServer: http.Server | null = null;
    private uiServer: UIServer | null = null;
    private ports: ServerPorts = { relay: 0, dashboard: 0, ui: 0 };
    private isShuttingDown = false;
    private signalHandlersRegistered = false;

    constructor(private readonly options: ServerManagerOptions = {}) {
        this.registerSignalHandlers();
    }

    private registerSignalHandlers(): void {
        if (this.signalHandlersRegistered) return;
        process.on('SIGINT', () => this.shutdown());
        process.on('SIGTERM', () => this.shutdown());
        process.on('exit', () => this.shutdown());
        this.signalHandlersRegistered = true;
    }

    async start(agents: DashboardAgent[], requestedUiPort: number = DEFAULT_PORTS.ui): Promise<ServerPorts> {
        // 1. Find Ports
        this.ports.relay = await this.findFreePort(DEFAULT_PORTS.relay);
        this.ports.dashboard = await this.findFreePort(DEFAULT_PORTS.dashboard);
        this.ports.ui = await this.findFreePort(requestedUiPort);

        console.log(chalk.gray(`Selected Ports - Relay: ${this.ports.relay}, Dashboard: ${this.ports.dashboard}, UI: ${this.ports.ui}`));

        // 2. Start Relay
        this.relayServer = new NostrRelay({ port: this.ports.relay });

        // 3. Start Dashboard
        this.dashboardServer = startDashboard(this.ports.dashboard, this.ports.ui, agents, this.relayUrl);

        // 4. Start UI Server (optional)
        if (this.options.startUiServer !== false) {
            this.uiServer = new UIServer({ port: this.ports.ui });
            await this.uiServer.start();
        }

        return this.ports;
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        console.log(chalk.yellow('\n🛑 Shutting down servers...'));

        if (this.relayServer) await this.relayServer.close();
        if (this.dashboardServer) this.dashboardServer.close();
        if (this.uiServer) this.uiServer.stop();
    }

    closeDashboard() {
        if (this.dashboardServer) {
            this.dashboardServer.close();
            this.dashboardServer = null;
        }
    }

    private findFreePort(startPort: number, maxAttempts = 100): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.unref();
            server.on('error', () => {
                // Port in use, try next one
                if (maxAttempts <= 1) {
                    reject(new Error(`Could not find free port after ${100} attempts`));
                } else {
                    this.findFreePort(startPort + 1, maxAttempts - 1).then(resolve, reject);
                }
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
        return this.relayServer?.url ?? `ws://localhost:${this.ports.relay}`;
    }
}
