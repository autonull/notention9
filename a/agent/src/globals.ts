// Simple singleton management for the agent module
import { AgentRegistry } from './core/AgentRegistry';
// We will import SkillRegistry type later when we create it, for now use any or interface
// import { SkillRegistry } from './skills/SkillRegistry';

let agentRegistry: AgentRegistry | null = null;
let skillRegistry: any | null = null;
let ontology: any | null = null;

export function getAgentRegistry(): AgentRegistry {
    if (!agentRegistry) {
        agentRegistry = new AgentRegistry();
    }
    return agentRegistry;
}

export function setSkillRegistry(registry: any) {
    skillRegistry = registry;
}

export function getSkillRegistry(): any {
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
