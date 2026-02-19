import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DashboardAgent {
    id: string; // The subdomain part
    name: string;
    role: string;
}

export function startDashboard(port: number, uiPort: number, agents: DashboardAgent[]) {
    const app = express();
    const server = http.createServer(app);

    const indexPath = path.join(__dirname, 'index.html');
    const template = fs.readFileSync(indexPath, 'utf-8');

    // Simple template injection
    // We inject the configuration into the <head> or just before </body>
    const configScript = `
        <script>
            window.AGENTS = ${JSON.stringify(agents)};
            window.UI_PORT = ${uiPort};
            window.RELAY_URL = 'ws://localhost:4444'; // Hardcoded for now, or pass as arg
        </script>
    `;

    // Inject before the existing script tag or at end of body
    const html = template.replace('</body>', `${configScript}</body>`);

    app.get('/', (req, res) => {
        res.send(html);
    });

    server.listen(port, () => {
        console.log(`Dashboard running at http://localhost:${port}`);
    });

    return server;
}
