import type {AIProvider, InferredAttribute, OntologyNode} from '@notention/core';

export class MockLLMProvider implements AIProvider {
    name = 'Mock AI (Fallback)';
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

        // 1. Flywheel: Try to reuse existing keys
        ontologyKeys.forEach(key => {
            if (lowerText.includes(key.toLowerCase())) {
                // Determine operator/value heuristically for simulation
                if (key === 'budget') tags.push(`[budget < 500]`);
                else if (key === 'rate') tags.push(`[rate:is:50]`);
                else tags.push(`[${key}:is:true]`); // Generic boolean/presence
            }
        });

        // 2. Evolution: If no existing keys found (or just to add variety), invent some
        if (tags.length === 0) {
            if (lowerText.includes("react")) tags.push("[skill:is:React]");
            if (lowerText.includes("developer")) tags.push("[role:is:Developer]");
            // If we didn't find 'budget' in existing ontology but text has it, suggest it
            if (lowerText.includes("budget") && !ontologyKeys.has('budget')) tags.push("[budget < 500]");
        }

        return tags;
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

    async alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]> {
        return this.suggestTags(text, ontology);
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
