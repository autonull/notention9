/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly PROJECT_ROOT: string;
    readonly VITE_TELEMETRY: string;
    readonly VITE_DEV_HOOKS: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}