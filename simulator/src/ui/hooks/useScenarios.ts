import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui';

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  agentCount?: number;
  duration?: number;
  tags: string[];
}

export const SCENARIO_DETAILS: Record<string, ScenarioInfo> = {
  'gig-economy': {
    id: 'gig-economy',
    name: 'Gig Economy',
    description: 'Simulates a marketplace with workers and clients negotiating tasks. Demonstrates dynamic pricing, reputation systems, and market equilibrium.',
    agentCount: 10,
    duration: 60,
    tags: ['marketplace', 'negotiation', 'reputation'],
  },
  generate: {
    id: 'generate',
    name: 'Random Generation',
    description: 'Procedurally generate a unique scenario with randomized agents, behaviors, and objectives. Every run is different.',
    tags: ['procedural', 'experimental', 'unpredictable'],
  },
};

export function useScenarios() {
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scenarios');
      const data = await res.json();
      setScenarios(['generate', ...data]);
    } catch (err) {
      addToast('Failed to load scenarios', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  return { scenarios, loading, reload: loadScenarios };
}

export function useScenarioDetails(scenarioId: string) {
  return SCENARIO_DETAILS[scenarioId] || {
    id: scenarioId,
    name: scenarioId,
    description: 'Custom scenario',
    tags: [],
  };
}