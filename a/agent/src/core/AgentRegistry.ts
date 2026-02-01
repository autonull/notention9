import { Agent } from '@notention/core/src/types';

export class AgentRegistry {
    private agents = new Map<string, Agent>();
    private defaultAgent: string | null = null;

    register(id: string, agent: Agent): void {
        this.agents.set(id, agent);
        if (!this.defaultAgent) {
            this.defaultAgent = id;
        }
    }

    unregister(id: string): boolean {
        if (this.defaultAgent === id) {
            this.defaultAgent = null;
        }
        return this.agents.delete(id);
    }

    get(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    getDefault(): Agent | undefined {
        return this.defaultAgent ? this.agents.get(this.defaultAgent) : undefined;
    }

    setDefault(id: string): void {
        if (!this.agents.has(id)) {
            throw new Error(`Agent ${id} not registered`);
        }
        this.defaultAgent = id;
    }

    getAll(): Array<{ id: string; agent: Agent }> {
        return Array.from(this.agents.entries()).map(([id, agent]) => ({ id, agent }));
    }
}
