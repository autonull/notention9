import { useRef, useEffect, useCallback } from 'react';
import { INITIAL_AGENTS, type SimulationAgent, SELF_AGENT_ID } from './types';
import { useLocalForage } from '../useLocalForage';

export const useSimulationAgents = () => {
  const [agents, setAgents, isLoading] = useLocalForage<SimulationAgent[]>('notention-agents', INITIAL_AGENTS);

  // State Refs for loop access
  const agentsRef = useRef(agents);

  // Keep refs in sync
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // Ensure Self Agent exists
  useEffect(() => {
      if (!isLoading) {
          const selfAgent = agents.find(a => a.id === SELF_AGENT_ID);
          if (!selfAgent) {
              const defaultSelf = INITIAL_AGENTS.find(a => a.id === SELF_AGENT_ID);
              if (defaultSelf) {
                  setAgents(prev => [defaultSelf, ...prev]);
              }
          }
      }
  }, [agents, isLoading, setAgents]);

  const updateAgent = useCallback((index: number, updates: Partial<SimulationAgent>) => {
    setAgents(prev => {
        const next = [...prev];
        if (next[index]) {
            next[index] = { ...next[index], ...updates };
        }
        return next;
    });
  }, [setAgents]);

  const deploySwarm = useCallback((newAgents: SimulationAgent[]) => {
      setAgents(prev => [...prev, ...newAgents]);
  }, [setAgents]);

  const addAgent = useCallback(() => {
      setAgents(prev => [
          ...prev,
          {
              id: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
              name: `Agent ${prev.length + 1}`,
              persona: "You are a new agent.",
              bio: "New Agent.",
              goal: "Set a goal.",
              currentDraft: "",
              status: "Idle",
              isAgent: true,
              enabled: true
          }
      ]);
  }, [setAgents]);

  const removeAgent = useCallback((id: string) => {
      if (id === SELF_AGENT_ID) return; // Cannot remove self
      setAgents(prev => prev.filter(a => a.id !== id));
  }, [setAgents]);

  const toggleAgent = useCallback((id: string) => {
      setAgents(prev => prev.map(a => {
          if (a.id === id) {
              return { ...a, enabled: !a.enabled };
          }
          return a;
      }));
  }, [setAgents]);

  return {
    agents,
    agentsRef,
    updateAgent,
    deploySwarm,
    addAgent,
    removeAgent,
    toggleAgent,
    isLoading
  };
};
