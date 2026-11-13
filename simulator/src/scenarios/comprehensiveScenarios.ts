import { Scenario, AgentConfig, EventConfig, Property } from '../types.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });

const agent = (role: string, config: Partial<AgentConfig>): AgentConfig => ({
    role,
    count: 1,
    properties: [],
    interests: [],
    traits: [],
    ...config,
});

const camera = (focus: string, at: number): EventConfig => ({
    at,
    action: 'camera',
    actorRole: 'system',
    cameraFocus: focus,
});

export const COMPREHENSIVE_SCENARIOS: Record<string, Scenario> = {
    // 1. semantic-capture (Capability 1, 2)
    'semantic-capture': {
        name: 'Semantic Capture',
        description: 'Voice note becomes structured note with extracted properties',
        agents: [
            agent('User', {
                count: 1,
                traits: ['golden-path'],
            }),
        ],
        events: [
            {
                at: 2,
                action: 'capture_raw',
                actorRole: 'User',
                inputMethod: 'raw',
                cameraFocus: 'editor',
            },
            { at: 4, action: 'show_extraction', actorRole: 'system', cameraFocus: 'editor' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['golden-path', 'domain'],
        requires: ['ui'],
        difficulty: 'easy',
    },

    // 2. bidirectional-match (Capability 2)
    'bidirectional-match': {
        name: 'Bidirectional Match',
        description: 'Request finds matching offers with explanations',
        agents: [
            agent('Requester', {
                count: 1,
                properties: [prop('job', 'is', 'developer'), prop('budget', 'is', '5000'), prop('remote', 'is', 'true')],
                interests: [prop('developer', 'is', 'available')],
            }),
            agent('Offerer', {
                count: 3,
                properties: [prop('role', 'is', 'developer'), prop('rate', 'is', '120'), prop('skills', 'contains', 'react', 'typescript')],
                interests: [prop('job', 'is', 'developer')],
            }),
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Requester', cameraFocus: 'Requester 1' },
            { at: 4, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
            { at: 5, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 2' },
            { at: 6, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 3' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'dashboard-matches' },
            { at: 10, action: 'accept_match', actorRole: 'Requester', cameraFocus: 'Requester 1' },
        ],
        duration: 14,
        tags: ['domain', 'regression'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // 3. verifiable-coordination (Capability 3)
    'verifiable-coordination': {
        name: 'Verifiable Coordination',
        description: 'Request → Response → Accept → Complete with receipt chain',
        agents: [
            agent('Requester', { count: 1 }),
            agent('Offerer', { count: 1 }),
        ],
        events: [
            { at: 2, action: 'draft_request', actorRole: 'Requester', cameraFocus: 'Requester 1' },
            { at: 4, action: 'publish_request', actorRole: 'Requester', cameraFocus: 'Requester 1' },
            { at: 6, action: 'match_found', actorRole: 'system', cameraFocus: 'Requester 1' },
            { at: 8, action: 'respond', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
            { at: 10, action: 'accept', actorRole: 'Requester', cameraFocus: 'Requester 1' },
            { at: 12, action: 'complete', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
            { at: 14, action: 'export_receipts', actorRole: 'Requester', cameraFocus: 'Requester 1' },
        ],
        duration: 18,
        tags: ['domain', 'regression'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // 4. multi-device-sync (Capability 4)
    'multi-device-sync': {
        name: 'Multi-Device Sync',
        description: 'Same identity on phone and laptop, revoke lost device',
        agents: [
            agent('User', {
                count: 1,
                traits: ['golden-path'],
            }),
        ],
        events: [
            { at: 2, action: 'link_device', actorRole: 'User', cameraFocus: 'connections', inputMethod: 'raw' },
            { at: 4, action: 'capture_note', actorRole: 'User', cameraFocus: 'editor' },
            { at: 6, action: 'show_sync', actorRole: 'system', cameraFocus: 'editor' },
            { at: 8, action: 'revoke_device', actorRole: 'User', cameraFocus: 'connections' },
        ],
        duration: 12,
        tags: ['golden-path', 'domain'],
        requires: ['ui'],
        difficulty: 'easy',
    },

    // 5. ontology-evolution (Capability 5)
    'ontology-evolution': {
        name: 'Ontology Evolution',
        description: 'User adds custom ontology nodes and uses them',
        agents: [
            agent('User', {
                count: 1,
                traits: ['golden-path'],
            }),
        ],
        events: [
            { at: 2, action: 'open_ontology', actorRole: 'User', cameraFocus: 'ontology' },
            { at: 4, action: 'create_node', actorRole: 'User', cameraFocus: 'ontology' },
            { at: 6, action: 'add_attributes', actorRole: 'User', cameraFocus: 'ontology' },
            { at: 8, action: 'capture_with_custom', actorRole: 'User', cameraFocus: 'editor' },
            { at: 10, action: 'show_extraction', actorRole: 'system', cameraFocus: 'editor' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['ui'],
        difficulty: 'medium',
    },

    // 6. resilient-networking (Capability 6)
    'resilient-networking': {
        name: 'Resilient Networking',
        description: 'Relay dies, notes queue offline, flush on reconnect',
        agents: [
            agent('User', {
                count: 1,
                traits: ['golden-path'],
            }),
        ],
        events: [
            { at: 2, action: 'show_relays', actorRole: 'User', cameraFocus: 'connections' },
            { at: 4, action: 'publish_note', actorRole: 'User', cameraFocus: 'editor' },
            { at: 6, action: 'kill_relay', actorRole: 'system', cameraFocus: 'connections' },
            { at: 8, action: 'publish_note_offline', actorRole: 'User', cameraFocus: 'editor' },
            { at: 10, action: 'restore_relay', actorRole: 'system', cameraFocus: 'connections' },
            { at: 12, action: 'show_flush', actorRole: 'system', cameraFocus: 'insights' },
        ],
        duration: 14,
        tags: ['domain', 'stress'],
        requires: ['relay', 'ui'],
        difficulty: 'medium',
    },

    // 7. agent-automation (Capability 7)
    'agent-automation': {
        name: 'Agent Automation',
        description: 'User asks agent to browse and summarize into a note',
        agents: [
            agent('User', { count: 1 }),
            agent('Agent', {
                count: 1,
                traits: ['browser'],
            }),
        ],
        events: [
            { at: 2, action: 'enable_browser_cap', actorRole: 'User', cameraFocus: 'settings' },
            { at: 4, action: 'agent_summarize', actorRole: 'User', cameraFocus: 'editor' },
            { at: 8, action: 'show_agent_cursor', actorRole: 'system', cameraFocus: 'agent' },
            { at: 12, action: 'show_result_note', actorRole: 'User', cameraFocus: 'editor' },
        ],
        duration: 14,
        tags: ['domain'],
        requires: ['agent', 'ui'],
        difficulty: 'hard',
    },

    // 8. self-improving-eval (Capability 8)
    'self-improving-eval': {
        name: 'Self-Improving Evaluation',
        description: 'Optimizer mines usage, generates journey, runs regression',
        agents: [
            agent('User', { count: 1 }),
            agent('Optimizer', {
                count: 1,
                traits: ['background'],
            }),
        ],
        events: [
            { at: 2, action: 'capture_note', actorRole: 'User', cameraFocus: 'editor' },
            { at: 4, action: 'optimizer_mine', actorRole: 'Optimizer', cameraFocus: 'insights' },
            { at: 6, action: 'optimizer_generate_journey', actorRole: 'Optimizer', cameraFocus: 'insights' },
            { at: 8, action: 'optimizer_run_regression', actorRole: 'Optimizer', cameraFocus: 'insights' },
            { at: 10, action: 'show_results', actorRole: 'User', cameraFocus: 'insights' },
        ],
        duration: 12,
        tags: ['domain'],
        requires: ['optimizer', 'ui'],
        difficulty: 'hard',
    },

    // 9. accessible-i18n (Capability 9)
    'accessible-i18n': {
        name: 'Accessible & International',
        description: 'Arabic RTL, high contrast, keyboard-only, screen reader',
        agents: [
            agent('User', { count: 1 }),
        ],
        events: [
            { at: 2, action: 'switch_language', actorRole: 'User', cameraFocus: 'settings' },
            { at: 4, action: 'enable_high_contrast', actorRole: 'User', cameraFocus: 'settings' },
            { at: 6, action: 'keyboard_nav', actorRole: 'User', cameraFocus: 'inbox' },
            { at: 8, action: 'screen_reader_announce', actorRole: 'system', cameraFocus: 'inbox' },
        ],
        duration: 10,
        tags: ['regression', 'golden-path'],
        requires: ['ui'],
        difficulty: 'medium',
    },

    // 10. local-telemetry (Capability 10)
    'local-telemetry': {
        name: 'Local Telemetry',
        description: 'Sync health, friction journal, commitment lifecycle - all local',
        agents: [
            agent('User', { count: 1 }),
        ],
        events: [
            { at: 2, action: 'generate_activity', actorRole: 'User', cameraFocus: 'inbox' },
            { at: 4, action: 'show_sync_health', actorRole: 'system', cameraFocus: 'insights' },
            { at: 6, action: 'show_friction_journal', actorRole: 'system', cameraFocus: 'insights' },
            { at: 8, action: 'show_commitment_lifecycle', actorRole: 'system', cameraFocus: 'insights' },
        ],
        duration: 10,
        tags: ['golden-path'],
        requires: ['ui'],
        difficulty: 'easy',
    },

    // 11. family-evacuation (Capability 11 - survival)
    'family-evacuation': {
        name: 'Family Evacuation',
        description: 'Family manifest finds shelter, meds, and safe route',
        agents: [
            agent('Family', {
                count: 1,
                properties: [prop('manifest', 'contains', 'infant', 'elderly', 'diabetic')],
                interests: [prop('shelter', 'is', 'available'), prop('medical', 'is', 'available'), prop('transport', 'is', 'available')],
            }),
            agent('ShelterProvider', {
                count: 2,
                properties: [prop('shelterType', 'is', 'building'), prop('capacity', 'is', '10')],
            }),
            agent('MedicalProvider', {
                count: 1,
                properties: [prop('capability', 'is', 'insulin-storage')],
            }),
            agent('TransportProvider', {
                count: 1,
                properties: [prop('vehicle', 'is', 'van'), prop('offRoad', 'is', 'true')],
            }),
        ],
        events: [
            { at: 2, action: 'publish_manifest', actorRole: 'Family', cameraFocus: 'manifest' },
            { at: 4, action: 'publish_offer', actorRole: 'ShelterProvider', cameraFocus: 'ShelterProvider 1' },
            { at: 5, action: 'publish_offer', actorRole: 'MedicalProvider', cameraFocus: 'MedicalProvider 1' },
            { at: 6, action: 'publish_offer', actorRole: 'TransportProvider', cameraFocus: 'TransportProvider 1' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'map-routing' },
            { at: 11, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 14,
        tags: ['domain', 'stress'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },

    // 12. resource-distribution (Capability 11 - commons)
    'resource-distribution': {
        name: 'Resource Distribution',
        description: 'Neighbourhood shares water without a server (Ostrom commons)',
        agents: [
            agent('Coordinator', {
                count: 2,
                interests: [prop('water', 'is', 'needed'), prop('food', 'is', 'needed'), prop('medical', 'is', 'needed')],
            }),
            agent('Supplier', {
                count: 4,
                properties: [prop('resourceType', 'contains', 'water', 'food', 'medical'), prop('quantity', 'is', '100+')],
            }),
        ],
        events: [
            { at: 2, action: 'publish_job', actorRole: 'Coordinator', cameraFocus: 'Coordinator 1' },
            { at: 3, action: 'publish_job', actorRole: 'Coordinator', cameraFocus: 'Coordinator 2' },
            { at: 5, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 1' },
            { at: 6, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 2' },
            { at: 7, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 3' },
            { at: 8, action: 'publish_offer', actorRole: 'Supplier', cameraFocus: 'Supplier 4' },
            { at: 10, action: 'camera', actorRole: 'system', cameraFocus: 'map-deficit' },
            { at: 12, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 14,
        tags: ['domain', 'stress'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },

    // 13. mesh-relay-failover (Capability 6, 11)
    'mesh-relay-failover': {
        name: 'Mesh Relay Failover',
        description: 'No internet - mesh carries the note via bridge daemon',
        agents: [
            agent('UserA', {
                count: 1,
                interests: [prop('sync', 'is', 'needed')],
            }),
            agent('UserB', {
                count: 1,
                interests: [prop('sync', 'is', 'needed')],
            }),
            agent('BridgeDaemon', {
                count: 1,
                traits: ['bridge'],
            }),
        ],
        events: [
            { at: 2, action: 'publish_note', actorRole: 'UserA', cameraFocus: 'editor' },
            { at: 4, action: 'bridge_connect', actorRole: 'BridgeDaemon', cameraFocus: 'connections' },
            { at: 6, action: 'relay_reconnect', actorRole: 'system', cameraFocus: 'editor' },
            { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
        ],
        duration: 12,
        tags: ['domain', 'stress'],
        requires: ['relay', 'ui'],
        difficulty: 'hard',
    },
};

export function getComprehensiveScenarioNames(): string[] {
    return Object.keys(COMPREHENSIVE_SCENARIOS);
}

export function getComprehensiveScenario(name: string): Scenario | undefined {
    return COMPREHENSIVE_SCENARIOS[name];
}

export function getAllComprehensiveScenarios(): Scenario[] {
    return Object.values(COMPREHENSIVE_SCENARIOS);
}