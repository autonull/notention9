import { useEffect } from 'react';
import type { OntologyNode } from '@notention/core';
import type { AIProvider } from '../../services/ai/types';
import type { SimulationAgent } from './types';
import { Gardener } from '../../services/gardener';
import { WebLLMProvider } from '../../services/ai/WebLLMProvider';
import { MockLLMProvider } from '../../services/ai/MockLLMProvider';

interface UseSimulationLoopProps {
    active: boolean;
    agentsRef: React.MutableRefObject<SimulationAgent[]>;
    updateAgent: (index: number, updates: Partial<SimulationAgent>) => void;
    ontologyRef: React.MutableRefObject<OntologyNode[]>;
    aiRef: React.MutableRefObject<AIProvider | null>;
    gardenerRef: React.MutableRefObject<Gardener | null>;
    addLog: (msg: string, type: 'info' | 'match' | 'ontology' | 'reuse') => void;
    setAiProviderName: (name: string) => void;
}

export const useSimulationLoop = ({
    active,
    agentsRef,
    updateAgent,
    ontologyRef,
    aiRef,
    gardenerRef,
    addLog,
    setAiProviderName
}: UseSimulationLoopProps) => {

  useEffect(() => {
    if (!active) return;

    let timeoutId: NodeJS.Timeout;

    const simulateTyping = async (index: number, fullText: string) => {
        for (let i = 0; i <= fullText.length; i++) {
            updateAgent(index, { currentDraft: fullText.slice(0, i) });
            await new Promise(r => setTimeout(r, 50));
        }
    };

    const loop = async () => {
        if (!aiRef.current) return; // Wait for AI init

        // Use ref to get latest state inside async loop
        const currentAgents = agentsRef.current;
        const currentOntology = ontologyRef.current;
        const agentIndex = currentAgents.findIndex(a => a.status === 'Idle');

        if (agentIndex === -1) {
            timeoutId = setTimeout(loop, 1000);
            return;
        }

        const agent = currentAgents[agentIndex];

        // 1. Update Status: Thinking
        updateAgent(agentIndex, { status: 'Thinking...' });

        // 2. AI Generation
        try {
            const prompt = `
                ${agent.persona}
                Your current goal is: ${agent.goal}
                Write a short note content that achieves this goal.
                Keep it under 20 words.
                Do not include tags yet.
            `;

            // Fallback handling inside the loop in case runtime error occurs
            let content = "";
            try {
                content = await aiRef.current.generateCompletion(prompt);
            } catch (e) {
                console.error("AI Generation failed:", e);
                // Last ditch fallback if main provider crashes mid-loop
                if (aiRef.current instanceof WebLLMProvider) {
                   addLog("WebLLM crashed, switching to Mock", 'info');
                   aiRef.current = new MockLLMProvider();
                   setAiProviderName(aiRef.current.name);
                   gardenerRef.current = new Gardener(aiRef.current);
                   content = await aiRef.current.generateCompletion(prompt);
                } else {
                   throw e;
                }
            }

            // 3. Typing Animation
            updateAgent(agentIndex, { status: 'Typing...' });
            await simulateTyping(agentIndex, content);

            // 4. AI Tagging (Gardener) & Ontology Evolution
            // Pass the CURRENT ontology to the AI so it knows what terms to reuse!
            updateAgent(agentIndex, { status: 'Gardening...' });

            // Use alignToOntology if available to ensure semantic format
            let tags: string[] = [];
            if (aiRef.current.alignToOntology) {
                 tags = await aiRef.current.alignToOntology(content, currentOntology);
            } else {
                 tags = await aiRef.current.suggestTags(content, currentOntology);
            }

            // Visualize Tag Reuse
            const existingKeys = new Set<string>();
            const traverse = (nodes: OntologyNode[]) => {
                nodes.forEach(n => {
                    if (n.attributes) Object.keys(n.attributes).forEach(k => existingKeys.add(k));
                    if (n.children) traverse(n.children);
                });
            };
            traverse(currentOntology);

            tags.forEach(t => {
                // Parse tag: [key:op:val]
                const match = t.match(/^\[([a-zA-Z0-9_]+)/);
                if (match) {
                    const key = match[1];
                    if (existingKeys.has(key)) {
                        addLog(`♻️ Reused schema: ${key}`, 'reuse');
                    }
                }
            });

            const taggedContent = content + '\n\n' + tags.map((t: string) => JSON.stringify(t)).join(' ');
            updateAgent(agentIndex, { currentDraft: taggedContent });

            // 5. Done - Publish Trigger
            updateAgent(agentIndex, { status: 'Published', goal: 'Wait for matches' });
            addLog(`${agent.name} published a note`, 'info');

            // Wait a bit before next loop
        // Add randomness to the delay (2000ms - 5000ms) to feel more organic
        const delay = 2000 + Math.random() * 3000;
        await new Promise(r => setTimeout(r, delay));
            updateAgent(agentIndex, { status: 'Idle' });

        } catch (e) {
            console.error(e);
            updateAgent(agentIndex, { status: 'Error' });
            // Add slight delay on error to avoid rapid looping
            await new Promise(r => setTimeout(r, 2000));
        }

        timeoutId = setTimeout(loop, 1000);
    };

    loop();

    return () => clearTimeout(timeoutId);
  }, [active, agentsRef, updateAgent, addLog, ontologyRef, aiRef, gardenerRef, setAiProviderName]);
};
