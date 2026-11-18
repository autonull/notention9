/** WebLLM model catalogue, kept free of the web-llm runtime so settings load lazily. */
export const AVAILABLE_MODELS = [
    {id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B (Balanced)'},
    {id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B (Fast, Lower Quality)'},
    {id: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC', label: 'RedPajama 3B'},
];
