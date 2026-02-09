import {useCallback, useEffect, useRef, useState} from 'react';
import type {AIProvider, Note, OntologyNode} from '@notention/core';
import {DEFAULT_ONTOLOGY, Logger} from '@notention/core';
import {Gardener} from '../../services/gardener';
import {WebLLMProvider} from '../../services/ai/WebLLMProvider';
import {MockLLMProvider} from '../../services/ai/MockLLMProvider';
import {useSimulationAgents} from './useSimulationAgents';
import {useSimulationNetwork} from './useSimulationNetwork';
import {useSimulationLoop} from './useSimulationLoop';
import {useNotes} from '../useNotes';
import type {SimulationAgent} from './types';
import {useAgentInteraction} from './useAgentInteraction';
import {useSimulatorOntology} from './useSimulatorOntology';

const RANDOM_PERSONAS = [
    {
        name: "Carol (Designer)",
        persona: "You are Carol, a UI/UX designer obsessed with minimalist interfaces.",
        bio: "UI/UX Designer. Minimalist. 🎨",
        goal: "Find design inspiration or offer design reviews."
    },
    {
        name: "Dave (Manager)",
        persona: "You are Dave, a project manager who loves efficient workflows and timelines.",
        bio: "Project Manager. Efficiency expert. 📅",
        goal: "Organize tasks and timelines."
    },
    {
        name: "Eve (Hacker)",
        persona: "You are Eve, a security researcher looking for vulnerabilities.",
        bio: "Security Researcher. White hat. 🔒",
        goal: "Audit code and report bugs."
    },
    {
        name: "Frank (Writer)",
        persona: "You are Frank, a technical writer who values clear documentation.",
        bio: "Technical Writer. Docs are life. 📝",
        goal: "Write documentation for new features."
    },
    {
        name: "Grace (Data)",
        persona: "You are Grace, a data scientist interested in patterns and metrics.",
        bio: "Data Scientist. Patterns everywhere. 📊",
        goal: "Analyze community trends."
    }
];

export const useSimulator = () => {
    const {
        agents,
        agentsRef,
        updateAgent,
        deploySwarm: deploySwarmAgents,
        addAgent: addNewAgent,
        removeAgent,
        toggleAgent,
        isLoading: agentsLoading
    } = useSimulationAgents();

    const [active, setActive] = useState(false);
    const {notes: userNotes, addNote} = useNotes();

    const [ontology, setOntology] = useState<OntologyNode[]>(DEFAULT_ONTOLOGY);
    const ontologyRef = useRef(ontology);

    const [aiProviderName, setAiProviderName] = useState<string>("Initializing...");

    // AI & Gardener Refs
    const aiRef = useRef<AIProvider | null>(null);
    const gardenerRef = useRef<Gardener | null>(null);

    const {
        networkNotes,
        logs,
        notifications,
        newAttributes,
        handlePublish,
        addLog,
        setNetworkNotes
    } = useSimulationNetwork(ontologyRef, setOntology, gardenerRef);

    const {agentMessages, sendMessageToAgent, clearAgentMessages} = useAgentInteraction({
        agentsRef,
        aiRef,
        updateAgent,
        addLog
    });

    const {optimizeOntology} = useSimulatorOntology({
        ontologyRef,
        setOntology,
        gardenerRef,
        addLog
    });

    // Initialize AI Provider
    useEffect(() => {
        const initAI = async () => {
            try {
                // Attempt to load WebLLM
                const provider = new WebLLMProvider();

                if (('gpu' in navigator)) {
                    // Simple check, robust check involves requesting adapter
                } else {
                    throw new Error("WebGPU not supported");
                }

                // Note: We might want to properly initialize/check WebLLM here
                aiRef.current = provider;
                setAiProviderName(provider.name);
            } catch (e) {
                Logger.getInstance().warn("WebLLM failed to initialize, falling back to Mock:", e instanceof Error ? e : new Error(String(e)));
                aiRef.current = new MockLLMProvider();
                setAiProviderName(aiRef.current.name);
            }

            if (aiRef.current) {
                gardenerRef.current = new Gardener(aiRef.current);
            }
        };

        initAI();
    }, []);

    // Keep refs in sync
    useEffect(() => {
        ontologyRef.current = ontology;
    }, [ontology]);

    // Simulation Loop
    useSimulationLoop({
        active,
        agentsRef,
        updateAgent,
        ontologyRef,
        aiRef,
        gardenerRef,
        addLog,
        setAiProviderName
    });

    const randomizeAgent = useCallback((agentIndex: number) => {
        const random = RANDOM_PERSONAS[Math.floor(Math.random() * RANDOM_PERSONAS.length)];
        updateAgent(agentIndex, {
            name: random.name,
            persona: random.persona,
            bio: random.bio,
            goal: random.goal,
            currentDraft: '',
            status: 'Idle'
        });
        addLog(`Randomized agent to: ${random.name}`, 'info');
    }, [updateAgent, addLog]);

    const deploySwarm = useCallback((newAgents: SimulationAgent[]) => {
        deploySwarmAgents(newAgents);
        addLog(`Swarm deployed with ${newAgents.length} agents.`, 'info');
    }, [deploySwarmAgents, addLog]);

    const addAgent = useCallback(() => {
        addNewAgent();
        addLog("New agent added manually.", 'info');
    }, [addNewAgent, addLog]);

    const importUserNotes = useCallback(() => {
        setNetworkNotes(prev => {
            const imported = userNotes.filter(un => !prev.some(pn => pn.id === un.id));
            addLog(`Imported ${imported.length} user notes into simulator.`, 'info');
            return [...prev, ...imported];
        });
    }, [userNotes, addLog, setNetworkNotes]);

    const saveNetworkNote = useCallback((note: Note) => {
        addNote(note);
        addLog(`Saved note ${note.id.slice(0, 6)} to local notes.`, 'info');
    }, [addNote, addLog]);

    return {
        agents,
        updateAgent,
        active,
        setActive,
        logs,
        networkNotes,
        ontology,
        notifications,
        newAttributes,
        aiProviderName,
        handlePublish,
        agentMessages,
        sendMessageToAgent,
        clearAgentMessages,
        randomizeAgent,
        deploySwarm,
        optimizeOntology,
        importUserNotes,
        addAgent,
        removeAgent,
        toggleAgent,
        saveNetworkNote,
        agentsLoading
    };
};
