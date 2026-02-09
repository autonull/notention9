import {agentService} from './services/AgentService';

console.log('Testing agent connection...');

// Listen for connection events
agentService.on('connected', () => {
    console.log('✅ Connected to agent');
    console.log('Is online:', agentService.isOnline());
    console.log('Is offline:', agentService.isOffline());
});

agentService.on('disconnected', () => {
    console.log('⚠️ Disconnected from agent');
    console.log('Is online:', agentService.isOnline());
    console.log('Is offline:', agentService.isOffline());
});

// Try to connect
agentService.connect();

// Wait a bit then test sending data
setTimeout(() => {
    console.log('Sending test data...');
    agentService.send({type: 'test', payload: 'hello'});
}, 2000);

// Wait more and disconnect
setTimeout(() => {
    console.log('Test completed.');
}, 5000);