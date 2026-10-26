import { startDashboard } from './dashboard/server.js';
import chalk from 'chalk';
import type { Agent } from './agent.js';

export interface DashboardManagerOptions {
    dashboardPort: number;
    uiPort: number;
    relayUrl: string;
    onProgress?: (message: string) => void;
    onError?: (error: Error) => void;
}

export class DashboardManager {
    private dashboardServer: any | null = null;

    constructor(private readonly options: DashboardManagerOptions) {}

    start(agents: Agent[]): void {
        this.dashboardServer = startDashboard(
            this.options.dashboardPort,
            this.options.uiPort,
            agents.map(a => ({
                id: a.id,
                name: a.profile.name,
                role: a.profile.role
            })),
            this.options.relayUrl
        );
        this.log(`Dashboard server started on port ${this.options.dashboardPort}`);
    }

    stop(): void {
        if (this.dashboardServer) {
            this.dashboardServer.close();
            this.dashboardServer = null;
        }
    }

    isRunning(): boolean {
        return this.dashboardServer !== null;
    }

    private log(message: string) {
        this.options.onProgress?.(message) ?? console.log(chalk.blue(`[DashboardManager] ${message}`));
    }

    private error(err: Error) {
        this.options.onError?.(err) ?? console.error(chalk.red(`[DashboardManager Error]`), err);
    }
}