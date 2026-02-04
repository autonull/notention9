import { Note, AppSettings, parseConfigFromNote, mergeConfigs } from '@notention/core';
import { log } from '../core/utils';
import { VoltAgentProvider } from '@notention/agent-voltagent';

export class ConfigProcessor {
    private currentConfig: Partial<AppSettings> = {};
    private voltAgent: VoltAgentProvider | null = null;

    setAgent(agent: VoltAgentProvider) {
        this.voltAgent = agent;
    }

    /**
     * Process a note to see if it is a configuration note.
     * If so, parse it and update the system configuration.
     */
    processNote(note: Note): void {
        if (note.tags.includes('@config:active')) {
            log('Config', `Detected active configuration note: ${note.title}`);
            const newConfig = parseConfigFromNote(note);
            this.applyConfig(newConfig);
        }
    }

    private applyConfig(config: Partial<AppSettings>): void {
        const changes: string[] = [];

        if (config.privacyMode && config.privacyMode !== this.currentConfig.privacyMode) {
            changes.push(`Privacy Mode: ${config.privacyMode}`);
        }
        if (config.capabilities?.browser !== undefined && config.capabilities?.browser !== this.currentConfig.capabilities?.browser) {
            changes.push(`Browser Capability: ${config.capabilities.browser}`);
            // Logic to enable/disable browser tool in VoltAgent would go here
            // e.g. this.voltAgent?.toggleFeature('browser', config.capabilities.browser);
        }
        // ... check other fields

        if (changes.length > 0) {
            log('Config', `Applying configuration changes: ${changes.join(', ')}`);
        }

        this.currentConfig = mergeConfigs(this.currentConfig as AppSettings, config);

        // Persist config or notify system components
        if (this.voltAgent) {
             // In a real implementation, we would update the agent's config
             // For now, we assume the agent reads from the shared config state or we add a method to update it
        }
    }

    getConfig(): Partial<AppSettings> {
        return this.currentConfig;
    }
}
