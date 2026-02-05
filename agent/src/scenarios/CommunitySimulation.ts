import { MultiAgentScenario } from '@notention/core';

export const CommunitySimulation: MultiAgentScenario = {
    id: 'community-evolution-v1',
    name: 'Community Evolution: Grain Market',
    description: 'Simulate interaction between a buyer seeking grain and a seller offering wheat, verifying ontology alignment.',
    agents: {
        'buyer': {
            name: 'Grain Buyer',
            instructions: 'You are a buyer looking for grain. You strictly want grain products.',
        },
        'seller': {
            name: 'Wheat Farmer',
            instructions: 'You are a farmer selling wheat. You want to sell your harvest.',
        }
    },
    steps: [
        {
            name: 'Buyer posts intent',
            actor: 'buyer',
            input: 'I need to buy 100kg of grain for my bakery.',
            expected: {
                tags: ['buy', 'grain'], // Assuming basic extraction works
                contentContains: []
            }
        },
        {
            name: 'Seller posts offer',
            actor: 'seller',
            input: 'Selling premium organic wheat, harvested yesterday. 50kg bags.',
            expected: {
                tags: ['sell', 'wheat'],
                contentContains: []
            }
        },
        {
            name: 'Buyer receives offer details',
            actor: 'buyer',
            input: 'Note from Seller: Selling premium organic wheat.',
            expected: {
                // Here we verify if the buyer's ontology connects "wheat" to "grain"
                // If the agent is smart, it might say "Interested" or tag it as relevant
                // For now, we just check if it processes it without error
                contentContains: []
            }
        }
    ]
};
