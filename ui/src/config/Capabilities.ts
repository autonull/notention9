export interface AppCapabilities {
    agent: boolean; // Enables WebSocket/Server interactions
    llm: 'browser' | 'server' | 'none'; // Defines available LM source
}

// Read from environment variables (Vite pattern)
const isAgentEnabled = import.meta.env.VITE_ENABLE_AGENT !== 'false'; // Default to true if not set
const llmSource = (import.meta.env.VITE_LLM_SOURCE as AppCapabilities['llm']) || 'server'; // Default to server

export const capabilities: AppCapabilities = {
    agent: isAgentEnabled,
    llm: llmSource
};

// Helper for UI debugging/display
export const getCapabilitiesStatus = () => {
    return `Agent: ${capabilities.agent ? 'Enabled' : 'Disabled'}, LLM: ${capabilities.llm}`;
};
