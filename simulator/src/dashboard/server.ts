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
    const vizPath = path.join(__dirname, 'ontology_viz.html');

    // Config Injection
    const configScript = `
        <script>
            window.AGENTS = ${JSON.stringify(agents)};
            window.UI_PORT = ${uiPort};
            window.RELAY_URL = 'ws://localhost:4444'; // Hardcoded for now
        </script>
    `;

    app.get('/', (req, res) => {
        const template = fs.readFileSync(indexPath, 'utf-8');
        const html = template.replace('</body>', `${configScript}</body>`);
        res.send(html);
    });

    app.get('/ontology', (req, res) => {
        const template = fs.readFileSync(vizPath, 'utf-8');
        const html = template.replace('</body>', `${configScript}</body>`);
        res.send(html);
    });

    server.listen(port, () => {
        console.log(`Dashboard running at http://localhost:${port}`);
    });

    return server;
}
