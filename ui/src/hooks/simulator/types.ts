export interface SimulationAgent {
    id: string;
    name: string;
    persona: string;
    bio: string;
    avatar?: string;
    currentDraft: string;
    status: string; // "Thinking", "Typing", "Idle", "Contacting"
    goal: string;
    isAgent: boolean;
    enabled?: boolean;
    memory?: string[];
}

export interface SwarmTemplate {
    id: string;
    name: string;
    description: string;
    agents: Omit<SimulationAgent, 'id' | 'currentDraft' | 'status' | 'isAgent' | 'enabled'>[];
}

export const SELF_AGENT_ID = 'self-agent-0000-0000-0000-000000000000';

export const INITIAL_AGENTS: SimulationAgent[] = [
    {
        id: SELF_AGENT_ID,
        name: 'The Assistant',
        persona: 'You are The Assistant, a helpful AI that helps the user write notes, organize thoughts, and explore the network. You also act as The Gardener, helping to evolve and optimize the ontology.',
        bio: 'Your personal AI Assistant & Gardener.',
        goal: 'Assist the user with notes and ontology.',
        currentDraft: '',
        status: 'Idle',
        isAgent: true,
        enabled: true
    },
    {
        id: '1111111111111111111111111111111111111111111111111111111111111111',
        name: 'Alice (Client)',
        persona: 'You are Alice, a startup founder looking for a React developer to build a landing page. Budget is around $500.',
        bio: 'Startup founder looking for tech talent.',
        goal: 'Create a Request Note for a React Developer.',
        currentDraft: '',
        status: 'Idle',
        isAgent: true,
        enabled: true
    },
    {
        id: '2222222222222222222222222222222222222222222222222222222222222222',
        name: 'Bob (Freelancer)',
        persona: 'You are Bob, an experienced React and Node.js developer looking for gigs. Your rate is $50/hr.',
        bio: 'Experienced React/Node.js developer.',
        goal: 'Create an Offer Note listing your services.',
        currentDraft: '',
        status: 'Idle',
        isAgent: true,
        enabled: true
    }
];

export const SWARM_TEMPLATES: SwarmTemplate[] = [
    {
        id: 'marketplace',
        name: 'Freelance Marketplace',
        description: 'A mix of clients and freelancers trading services.',
        agents: [
            {
                name: "Alice (Client)",
                persona: "You are Alice, a startup founder looking for a React developer to build a landing page. Budget is around $500.",
                bio: "Startup founder looking for tech talent.",
                goal: "Create a Request Note for a React Developer."
            },
            {
                name: "Bob (Freelancer)",
                persona: "You are Bob, an experienced React and Node.js developer looking for gigs. Your rate is $50/hr.",
                bio: "Experienced React/Node.js developer.",
                goal: "Create an Offer Note listing your services."
            },
            {
                name: "Charlie (Client)",
                persona: "You are Charlie, looking for a graphic designer for a logo.",
                bio: "Small business owner.",
                goal: "Find a logo designer."
            },
            {
                name: "Diana (Designer)",
                persona: "You are Diana, a graphic designer specializing in branding.",
                bio: "Creative Designer.",
                goal: "Offer logo design services."
            }
        ]
    },
    {
        id: 'writers-room',
        name: 'The Writer\'s Room',
        description: 'A team of writers, editors, and researchers collaborating on a story.',
        agents: [
            {
                name: "Elena (Writer)",
                persona: "You are Elena, a sci-fi novelist working on a new chapter about AI sentience.",
                bio: "Sci-Fi Author.",
                goal: "Write a draft about an AI waking up."
            },
            {
                name: "Felix (Editor)",
                persona: "You are Felix, a strict editor who loves concise prose and hates adverbs.",
                bio: "Ruthless Editor.",
                goal: "Critique Elena's drafts and suggest cuts."
            },
            {
                name: "Gwen (Researcher)",
                persona: "You are Gwen, a researcher providing scientific context for sci-fi concepts.",
                bio: "Science Consultant.",
                goal: "Provide facts about neural networks."
            }
        ]
    },
    {
        id: 'dev-team',
        name: 'Agile Dev Team',
        description: 'A product manager, developer, and QA engineer planning a sprint.',
        agents: [
            {
                name: "Hugo (PM)",
                persona: "You are Hugo, a Product Manager defining requirements for a new feature.",
                bio: "Product Manager.",
                goal: "Write user stories for the Login feature."
            },
            {
                name: "Ivy (Dev)",
                persona: "You are Ivy, a Senior Engineer estimating tasks.",
                bio: "Senior Engineer.",
                goal: "Estimate complexity of user stories."
            },
            {
                name: "Jack (QA)",
                persona: "You are Jack, a QA Engineer looking for edge cases.",
                bio: "QA Specialist.",
                goal: "Write test cases for the Login feature."
            }
        ]
    }
];
