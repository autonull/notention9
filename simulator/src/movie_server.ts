import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MovieMaker, MovieOptions } from './movie_maker.js';
import { SCENARIOS, generateScenario } from './scenarios/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class MovieServer {
    private app = express();
    private server: any;
    private currentJob: {
        maker: MovieMaker;
        logs: string[];
        status: 'running' | 'completed' | 'failed' | 'cancelled';
        scenarioName: string;
        dashboardPort: number;
    } | null = null;

    constructor(
        private relayUrl: string,
        private uiPort: number // Port where Agents UI is running
    ) {
        this.setupRoutes();
    }

    private setupRoutes() {
        this.app.use(express.json());

        // CORS
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            next();
        });

        // API
        this.app.get('/api/scenarios', (req, res) => {
            res.json(Object.keys(SCENARIOS));
        });

        this.app.get('/api/status', (req, res) => {
            res.json({
                job: this.currentJob ? {
                    status: this.currentJob.status,
                    scenario: this.currentJob.scenarioName,
                    logs: this.currentJob.logs,
                    dashboardPort: this.currentJob.dashboardPort
                } : null
            });
        });

        this.app.post('/api/jobs', async (req, res) => {
            if (this.currentJob && this.currentJob.status === 'running') {
                return res.status(409).json({ error: "Job already running" });
            }

            const { scenarioName, agentCount, duration } = req.body;
            let scenario;

            if (scenarioName === 'generate' || !scenarioName) {
                scenario = generateScenario(agentCount || 5, duration || 30);
            } else {
                scenario = SCENARIOS[scenarioName];
            }

            if (!scenario) {
                return res.status(404).json({ error: "Scenario not found" });
            }

            // Start Job
            const logs: string[] = [];
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputDir = path.resolve(process.cwd(), 'movies', `${scenario.name}-${timestamp}`);

            // Random port for dashboard to avoid collisions
            const dashboardPort = 4000 + Math.floor(Math.random() * 1000);

            const options: MovieOptions = {
                framerate: 24, // Higher framerate for smoother video
                resolution: { width: 1920, height: 1080 },
                uiPort: this.uiPort,
                dashboardPort,
                outputDir,
                skipUiServer: true, // ServerManager runs UI
                onProgress: (msg) => logs.push(msg),
                onError: (err) => logs.push(`Error: ${err.message}`)
            };

            const maker = new MovieMaker(this.relayUrl, options);
            this.currentJob = {
                maker,
                logs,
                status: 'running',
                scenarioName: scenario.name,
                dashboardPort
            };

            res.json({ success: true, jobId: scenario.name });

            // Async execution
            (async () => {
                try {
                    await maker.start(scenario);
                    if (this.currentJob) this.currentJob.status = 'completed';
                } catch (e) {
                    if (this.currentJob) this.currentJob.status = 'failed';
                }
            })();
        });

        this.app.post('/api/jobs/cancel', async (req, res) => {
            if (this.currentJob && this.currentJob.status === 'running') {
                await this.currentJob.maker.cancel();
                this.currentJob.status = 'cancelled';
                res.json({ success: true });
            } else {
                res.status(400).json({ error: "No running job" });
            }
        });

        this.app.get('/api/movies', (req, res) => {
            const moviesDir = path.resolve(process.cwd(), 'movies');
            if (!fs.existsSync(moviesDir)) return res.json([]);

            const dirs = fs.readdirSync(moviesDir).filter(f => fs.statSync(path.join(moviesDir, f)).isDirectory());
            const movies = dirs.map(d => {
                const mp4 = path.join(moviesDir, d, 'simulation.mp4');
                return {
                    name: d,
                    hasVideo: fs.existsSync(mp4),
                    path: `/movies/${d}/simulation.mp4`
                };
            }).filter(m => m.hasVideo); // Only return finished movies
            res.json(movies);
        });

        this.app.delete('/api/movies/:name', (req, res) => {
            const name = req.params.name;
            const dir = path.resolve(process.cwd(), 'movies', name);
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                res.json({ success: true });
            } else {
                res.status(404).json({ error: "Movie not found" });
            }
        });

        // Serve movies static
        this.app.use('/movies', express.static(path.resolve(process.cwd(), 'movies')));

        // Serve UI (if built)
        const uiBuildDir = path.resolve(__dirname, '../dist/ui');
        if (fs.existsSync(uiBuildDir)) {
             this.app.use(express.static(uiBuildDir));
             this.app.get('*', (req, res, next) => {
                 // Don't serve index.html for api requests
                 if (req.path.startsWith('/api') || req.path.startsWith('/movies')) return next();
                 res.sendFile(path.join(uiBuildDir, 'index.html'));
             });
        }
    }

    start(port: number) {
        this.server = this.app.listen(port, () => {
            console.log(`Movie UI Server running at http://localhost:${port}`);
        });
        return this.server;
    }
}
