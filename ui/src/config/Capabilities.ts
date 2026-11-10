export interface AppCapabilities {
    agent: boolean; // Enables WebSocket/Server interactions
    llm: 'browser' | 'server' | 'none'; // Defines available LM source
    network: boolean; // Enables outbound Nostr relay connections
}

// Read from environment variables (Vite pattern)
const isAgentEnabled = import.meta.env.VITE_ENABLE_AGENT !== 'false'; // Default to true if not set
const llmSource = (import.meta.env.VITE_LLM_SOURCE as AppCapabilities['llm']) || 'server'; // Default to server
// Outbound relay traffic is opt-in: dev/test stay local-first unless explicitly enabled.
const networkSetting = import.meta.env.VITE_ENABLE_NETWORK;
const isNetworkEnabled = networkSetting === undefined
    ? import.meta.env.PROD
    : networkSetting === 'true';

export const capabilities: AppCapabilities = {
    agent: isAgentEnabled,
    llm: llmSource,
    network: isNetworkEnabled
};

// Helper for UI debugging/display
export const getCapabilitiesStatus = () => {
    return `Agent: ${capabilities.agent ? 'Enabled' : 'Disabled'}, LLM: ${capabilities.llm}, Network: ${capabilities.network ? 'Enabled' : 'Disabled'}`;
};
