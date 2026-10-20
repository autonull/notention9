import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { NostrRelay } from '@notention/core';
import { startDashboard, DashboardAgent } from './dashboard/server.js';
import { UIServer } from './ui_server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerPorts {
    relay: number;
    dashboard: number;
    ui: number;
}

export class ServerManager {
    private relayServer: NostrRelay | null = null;
    private dashboardServer: http.Server | null = null;
    private uiServer: UIServer | null = null;
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
        this.relayServer = new NostrRelay({ port: this.ports.relay });

        // 3. Start Dashboard
        this.dashboardServer = startDashboard(this.ports.dashboard, this.ports.ui, agents);

        // 4. Start UI Server
        this.uiServer = new UIServer({ port: this.ports.ui });
        await this.uiServer.start();

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

        if (this.relayServer) await this.relayServer.close();
        if (this.dashboardServer) this.dashboardServer.close();
        if (this.uiServer) this.uiServer.stop();
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
        return this.relayServer?.url ?? `ws://localhost:${this.ports.relay}`;
    }
}
