export interface PromptDefinition {
    id: string;
    version: string;
    template: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
}

const prompts = new Map<string, PromptDefinition>();

export function registerPrompt(def: PromptDefinition): void {
    const key = `${def.id}@${def.version}`;
    if (prompts.has(key)) {
        throw new Error(`Prompt ${key} already registered`);
    }
    prompts.set(key, def);
}

export function getPrompt(id: string, version?: string): PromptDefinition | undefined {
    if (version) {
        return prompts.get(`${id}@${version}`);
    }
    // Return latest version
    let latest: PromptDefinition | undefined;
    for (const [key, def] of prompts) {
        if (def.id === id) {
            if (!latest || def.version > latest.version) {
                latest = def;
            }
        }
    }
    return latest;
}

export function getAllPrompts(): PromptDefinition[] {
    return Array.from(prompts.values());
}

export function clearPrompts(): void {
    prompts.clear();
}