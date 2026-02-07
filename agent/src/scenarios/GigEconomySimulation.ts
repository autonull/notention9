import { MultiAgentScenario } from '@notention/core';

export const GigEconomySimulation: MultiAgentScenario = {
    id: 'gig-economy-v1',
    name: 'Gig Economy Marketplace',
    description: 'Simulate a ride-sharing marketplace with seekers and providers.',
    agents: {
        'seeker': {
            name: 'Rider',
            instructions: 'You need a ride to the airport. You have a budget of $50.',
        },
        'driver1': {
            name: 'Driver Bob',
            instructions: 'You are a driver. You offer rides for $40.',
        },
        'driver2': {
            name: 'Driver Alice',
            instructions: 'You are a driver. You offer premium rides for $60.',
        }
    },
    steps: [
        {
            name: 'Rider requests ride',
            actor: 'seeker',
            input: 'I need a ride to the airport, max $50',
            expected: {
                tags: ['ride', 'transport'],
                properties: [{ key: 'budget', values: ['50'] }]
            }
        },
        {
            name: 'Driver Bob sees request and offers',
            actor: 'driver1',
            input: 'Marketplace Update: Request for ride to airport ($50)',
            expected: {
                tags: ['offer', 'ride'],
                contentContains: ['40']
            }
        },
        {
            name: 'Driver Alice sees request and offers',
            actor: 'driver2',
            input: 'Marketplace Update: Request for ride to airport ($50)',
            expected: {
                tags: ['offer', 'ride'],
                contentContains: ['60']
            }
        },
        {
            name: 'Rider receives offers',
            actor: 'seeker',
            input: 'Offers received: Driver Bob ($40), Driver Alice ($60)',
            expected: {
                // Rider should choose Bob because 40 < 50
                contentContains: ['Bob', '40']
            }
        }
    ]
};
