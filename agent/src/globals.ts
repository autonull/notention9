// Simple singleton management for the agent module
import { AgentRegistry } from './core/AgentRegistry';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';

let agentRegistry: AgentRegistry | null = null;
let skillRegistry: AgentSkillRegistry | null = null;
let ontology: any | null = null;

export function getAgentRegistry(): AgentRegistry {
    if (!agentRegistry) {
        agentRegistry = new AgentRegistry();
    }
    return agentRegistry;
}

export function setAgentRegistry(registry: AgentRegistry) {
    agentRegistry = registry;
}

export function setSkillRegistry(registry: AgentSkillRegistry) {
    skillRegistry = registry;
}

export function getSkillRegistry(): AgentSkillRegistry {
    if (!skillRegistry) {
        throw new Error("SkillRegistry not initialized");
    }
    return skillRegistry;
}

export function setOntology(onto: any) {
    ontology = onto;
}

export function getOntology(): any {
    return ontology;
}
