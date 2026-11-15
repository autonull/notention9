import { createModelDownloader } from 'node-llama-cpp';

const downloader = await createModelDownloader({
    modelUri: 'hf:bartowski/Qwen2.5-0.5B-Instruct-GGUF:Q4_K_M',
    dirPath: '/home/me/notention9/models',
    showCliProgress: true,
});

try {
    const modelPath = await downloader.download();
    console.log('Download complete:', modelPath);
} catch (e) {
    console.error('Download failed:', e);
    process.exit(1);
}