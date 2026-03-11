import { AgentRegistry } from './core/AgentRegistry.js';
import { AgentSkillRegistry } from './skills/AgentSkillRegistry.js';

let agentRegistry: AgentRegistry | null = null;
let skillRegistry: AgentSkillRegistry | null = null;
let ontology: unknown = null;

export const getAgentRegistry = (): AgentRegistry => {
  if (!agentRegistry) {
    agentRegistry = new AgentRegistry();
  }
  return agentRegistry;
};

export const setAgentRegistry = (registry: AgentRegistry): void => {
  agentRegistry = registry;
};

export const setSkillRegistry = (registry: AgentSkillRegistry): void => {
  skillRegistry = registry;
};

export const getSkillRegistry = (): AgentSkillRegistry => {
  if (!skillRegistry) {
    throw new Error('SkillRegistry not initialized');
  }
  return skillRegistry;
};

export const setOntology = (onto: unknown): void => {
  ontology = onto;
};

export const getOntology = (): unknown => ontology;
