import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { getLlama, LlamaChatSession } from 'node-llama-cpp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default Configuration
const DEFAULT_MODEL_URL = "https://huggingface.co/HuggingFaceTB/SmolLM-135M-Instruct-GGUF/resolve/main/smollm-135m-instruct.q4_k_m.gguf";
const DEFAULT_MODEL_FILENAME = "smollm-135m-instruct.q4_k_m.gguf";
const MODELS_DIR = path.join(__dirname, '../models');
const PORT = process.env.PORT || 11434;

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
}

async function downloadFile(url, destPath) {
    console.log(`Downloading model from ${url}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`);

    // Create write stream
    const fileStream = fs.createWriteStream(destPath);
    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    let downloadedBytes = 0;

    // Use manual reader for progress
    if (res.body) {
        const reader = res.body.getReader();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            downloadedBytes += value.length;
            fileStream.write(value); // value is Uint8Array

            if (totalBytes > 0) {
                const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                process.stdout.write(`\rProgress: ${percent}%`);
            }
        }
        fileStream.end();
    } else {
        throw new Error("Response body is empty");
    }

    console.log('\nDownload complete.');
}

async function startServer() {
    const modelUrl = process.env.MODEL_URL || DEFAULT_MODEL_URL;
    const modelFilename = process.env.MODEL_FILENAME || DEFAULT_MODEL_FILENAME;
    const modelPath = path.join(MODELS_DIR, modelFilename);

    if (!fs.existsSync(modelPath)) {
        await downloadFile(modelUrl, modelPath);
    }

    console.log(`Loading model: ${modelPath}`);
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath });
    const context = await model.createContext();
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });

    const server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Health/Models Check
        if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/api/tags')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                object: 'list',
                data: [{
                    id: modelFilename,
                    object: 'model',
                    created: Date.now(),
                    owned_by: 'local',
                    permission: []
                }]
            }));
            return;
        }

        if (req.method === 'POST' && req.url === '/v1/chat/completions') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { messages, stream } = JSON.parse(body);
                    const lastMessage = messages[messages.length - 1];
                    const prompt = lastMessage.content;

                    if (stream) {
                        res.writeHead(200, {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive'
                        });

                        const response = await session.prompt(prompt, {
                            onToken: (chunk) => {
                                const text = llama.getTokenString(chunk);
                                const data = JSON.stringify({
                                    id: 'chatcmpl-' + Date.now(),
                                    object: 'chat.completion.chunk',
                                    created: Math.floor(Date.now() / 1000),
                                    model: modelFilename,
                                    choices: [{ delta: { content: text }, index: 0, finish_reason: null }]
                                });
                                res.write(`data: ${data}\n\n`);
                            }
                        });

                        const doneData = JSON.stringify({
                            id: 'chatcmpl-' + Date.now(),
                            object: 'chat.completion.chunk',
                            created: Math.floor(Date.now() / 1000),
                            model: modelFilename,
                            choices: [{ delta: {}, index: 0, finish_reason: 'stop' }]
                        });
                        res.write(`data: ${doneData}\n\n`);
                        res.write('data: [DONE]\n\n');
                        res.end();
                    } else {
                        const response = await session.prompt(prompt);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            id: 'chatcmpl-' + Date.now(),
                            object: 'chat.completion',
                            created: Math.floor(Date.now() / 1000),
                            model: modelFilename,
                            choices: [{
                                index: 0,
                                message: { role: 'assistant', content: response },
                                finish_reason: 'stop'
                            }],
                            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                        }));
                    }
                } catch (e) {
                    console.error(e);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: { message: e.message, type: 'server_error', param: null, code: null } }));
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(PORT, () => {
        console.log(`Local LLM Server running on http://localhost:${PORT}`);
        console.log(`Model: ${modelFilename}`);
    });
}

startServer().catch(console.error);
