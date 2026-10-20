import type {OntologyNode, Property} from '@notention/core';
import type {AIProvider, InferredAttribute} from './types';

export class MockLLMProvider implements AIProvider {
    name = 'Mock AI (Fallback)';
    kind = 'local-model' as const;
    isAvailable = true;

    async generateCompletion(prompt: string): Promise<string> {
        // Intent Classification Mock
        if (prompt.includes("Does the user explicitly instruct the agent to change their goal")) {
            // Simple heuristic for mock: if user message says "goal", assume yes
            const userMessageMatch = prompt.match(/User Message: "(.*?)"/);
            const userMessage = userMessageMatch ? userMessageMatch[1] : "";

            if (userMessage.toLowerCase().includes("goal") || userMessage.toLowerCase().includes("change")) {
                // Extract a dummy goal
                const newGoal = userMessage.split(":").pop()?.trim() || "New Goal";
                return `GOAL: ${newGoal}`;
            }
            return "CHAT";
        }

        // Simulating Agent Goals with more variance
        const variations = [
            "Need a quick turnaround.",
            "Looking for long-term collaboration.",
            "Must be available immediately.",
            "Remote work preferred.",
            "Budget is flexible for the right person."
        ];
        const suffix = variations[Math.floor(Math.random() * variations.length)];

        if (prompt.includes("Client")) return `I need a React developer for a landing page. Budget $500. ${suffix}`;
        if (prompt.includes("Freelancer")) return `Expert React developer available for gigs. $50/hr. ${suffix}`;

        // Reply to goal change
        if (prompt.includes("User instructed you to:")) {
            return "Understood. I've updated my goal.";
        }

        // Generic fallback for other prompts
        return `Simulated content response. ${suffix}`;
    }

    async suggestTags(text: string, ontology?: OntologyNode[]): Promise<string[]> {
        // Extract ontology keys for reuse
        const ontologyKeys = new Set<string>();
        if (ontology) {
            const traverse = (nodes: OntologyNode[]) => {
                nodes.forEach(n => {
                    if (n.attributes) Object.keys(n.attributes).forEach(k => ontologyKeys.add(k));
                    if (n.children) traverse(n.children);
                });
            };
            traverse(ontology);
        }

        const tags: string[] = [];
        const lowerText = text.toLowerCase();

        ontologyKeys.forEach(key => {
            if (lowerText.includes(key.toLowerCase())) tags.push(key);
        });

        if (tags.length === 0) {
            if (lowerText.includes("react")) tags.push("react");
            if (lowerText.includes("developer")) tags.push("developer");
            if (lowerText.includes("budget")) tags.push("budget");
        }

        return Array.from(new Set(tags));
    }

    async analyzeOntology(): Promise<InferredAttribute[]> {
        // Mock Ontology Evolution
        // Randomly suggest a new attribute to demonstrate the loop
        const candidates = [
            {key: "availability", type: "string", description: "Project availability"},
            {key: "experience", type: "number", description: "Years of experience"},
            {key: "location", type: "string", description: "Remote or On-site"},
            {key: "timeline", type: "string", description: "Project timeline"}
        ] as const;

        // Pick one
        const pick = candidates[Math.floor(Math.random() * candidates.length)];

        return [{
            key: pick.key,
            type: pick.type,
            description: pick.description,
            usageCount: 1,
            sampleValues: ["Remote", "5 years", "Immediate"]
        }];
    }

    async alignToOntology(text: string, ontology: OntologyNode[]): Promise<Property[]> {
        const lowerText = text.toLowerCase();
        const properties: Property[] = [];
        const keys = new Set<string>();
        const traverse = (nodes: OntologyNode[]) => {
            nodes.forEach(node => {
                Object.keys(node.attributes ?? {}).forEach(key => keys.add(key));
                if (node.children) traverse(node.children);
            });
        };
        traverse(ontology);

        keys.forEach(key => {
            if (lowerText.includes(key.toLowerCase())) properties.push({key, operator: 'is', values: ['true']});
        });
        if (lowerText.includes('react')) properties.push({key: 'skill', operator: 'is', values: ['React']});
        if (lowerText.includes('developer')) properties.push({key: 'role', operator: 'is', values: ['Developer']});
        if (lowerText.includes('budget')) properties.push({key: 'budget', operator: 'less than', values: ['500']});

        return properties;
    }

    async optimizeOntology(ontology: OntologyNode[]): Promise<{
        merged: { source: string, target: string }[],
        pruned: string[]
    }> {
        // Mock optimization:
        // Check for 'cost' and 'price' -> merge to 'price'
        // Check for unused keys (we don't have usage stats here easily, but we can simulate pruning)

        const keys = new Set<string>();
        const traverse = (nodes: OntologyNode[]) => {
            nodes.forEach(n => {
                if (n.attributes) Object.keys(n.attributes).forEach(k => keys.add(k));
                if (n.children) traverse(n.children);
            });
        };
        traverse(ontology);

        const merged: { source: string, target: string }[] = [];
        if (keys.has('cost') && keys.has('price')) {
            merged.push({source: 'cost', target: 'price'});
        }

        // Mock random advice for demo purposes if nothing obvious
        if (merged.length === 0 && keys.size > 5 && keys.has('rate') && keys.has('salary')) {
            merged.push({source: 'rate', target: 'salary'});
        }

        return {
            merged,
            pruned: []
        };
    }
}
