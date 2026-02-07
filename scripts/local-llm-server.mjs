import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    modelUrl: process.env.MODEL_URL || "https://huggingface.co/HuggingFaceTB/SmolLM-135M-Instruct-GGUF/resolve/main/smollm-135m-instruct.q4_k_m.gguf",
    modelFilename: process.env.MODEL_FILENAME || "smollm-135m-instruct.q4_k_m.gguf",
    modelsDir: path.join(__dirname, '../models'),
    port: parseInt(process.env.PORT || '11434', 10)
};

class ModelManager {
    constructor(config) {
        this.config = config;
        if (!fs.existsSync(this.config.modelsDir)) {
            fs.mkdirSync(this.config.modelsDir, { recursive: true });
        }
    }

    getModelPath() {
        return path.join(this.config.modelsDir, this.config.modelFilename);
    }

    async ensureModel() {
        const modelPath = this.getModelPath();
        if (fs.existsSync(modelPath)) return modelPath;

        await this.downloadModel(modelPath);
        return modelPath;
    }

    async downloadModel(destPath) {
        console.log(`Downloading model from ${this.config.modelUrl}...`);
        try {
            const res = await fetch(this.config.modelUrl);
            if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`);

            if (!res.body) throw new Error("Response body is empty");

            const fileStream = fs.createWriteStream(destPath);
            const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
            let downloadedBytes = 0;
            const reader = res.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                downloadedBytes += value.length;
                fileStream.write(value);

                if (totalBytes > 0) {
                    const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                    process.stdout.write(`\rProgress: ${percent}%`);
                }
            }
            fileStream.end();
            console.log('\nDownload complete.');
        } catch (e) {
            // Clean up partial file
            if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
            throw e;
        }
    }
}

class Server {
    constructor(port, modelPath) {
        this.port = port;
        this.modelPath = modelPath;
    }

    async start() {
        console.log(`Loading model: ${this.modelPath}`);
        const llama = await getLlama();
        const model = await llama.loadModel({ modelPath: this.modelPath });
        const context = await model.createContext();
        // Create a single session for simplicity in this turnkey demo
        this.session = new LlamaChatSession({ contextSequence: context.getSequence() });
        this.llama = llama;

        const server = http.createServer(this.handleRequest.bind(this));

        return new Promise((resolve) => {
            server.listen(this.port, () => {
                console.log(`Local LLM Server running on http://localhost:${this.port}`);
                resolve(server);
            });
        });
    }

    async handleRequest(req, res) {
        this.setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/api/tags')) {
            return this.handleModels(res);
        }

        if (req.method === 'POST' && req.url === '/v1/chat/completions') {
            return this.handleChatCompletion(req, res);
        }

        res.writeHead(404);
        res.end();
    }

    setCorsHeaders(res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    handleModels(res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            object: 'list',
            data: [{
                id: 'local-model',
                object: 'model',
                created: Date.now(),
                owned_by: 'local',
                permission: []
            }]
        }));
    }

    async handleChatCompletion(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { messages, stream } = JSON.parse(body);
                const lastMessage = messages[messages.length - 1];
                const prompt = lastMessage.content;

                if (stream) {
                    await this.streamResponse(res, prompt);
                } else {
                    await this.jsonResponse(res, prompt);
                }
            } catch (e) {
                console.error(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: { message: e.message, type: 'server_error', param: null, code: null } }));
            }
        });
    }

    async streamResponse(res, prompt) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        await this.session.prompt(prompt, {
            onToken: (chunk) => {
                const text = this.llama.getTokenString(chunk);
                const data = JSON.stringify({
                    id: 'chatcmpl-' + Date.now(),
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: 'local-model',
                    choices: [{ delta: { content: text }, index: 0, finish_reason: null }]
                });
                res.write(`data: ${data}\n\n`);
            }
        });

        const doneData = JSON.stringify({
            id: 'chatcmpl-' + Date.now(),
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'local-model',
            choices: [{ delta: {}, index: 0, finish_reason: 'stop' }]
        });
        res.write(`data: ${doneData}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }

    async jsonResponse(res, prompt) {
        const response = await this.session.prompt(prompt);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            id: 'chatcmpl-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'local-model',
            choices: [{
                index: 0,
                message: { role: 'assistant', content: response },
                finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        }));
    }
}

async function main() {
    try {
        const manager = new ModelManager(CONFIG);
        const modelPath = await manager.ensureModel();
        const server = new Server(CONFIG.port, modelPath);
        await server.start();
    } catch (e) {
        console.error("Fatal Error:", e);
        process.exit(1);
    }
}

main();
