export {};

declare global {
    interface Window {
        AGENT_WS_URL?: string;
        __OPTIMIZER_AI__?: Record<string, unknown>;
    }
}
