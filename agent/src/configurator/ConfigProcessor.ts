import { parseConfigFromNote, mergeConfigs } from '@notention/core';
import type { Note, AppSettings } from '@notention/core';
import { log } from '../core/utils.ts';
import { Capabilities } from '../core/Capabilities.ts';
import { VoltAgentProvider } from '@notention/agent-voltagent';

export class ConfigProcessor {
    private currentConfig: Partial<AppSettings> = {};
    private voltAgent: VoltAgentProvider | null = null;

    setAgent(agent: VoltAgentProvider) {
        this.voltAgent = agent;
    }

    /**
     * Process a list of notes and apply configuration from any active config notes.
     * Useful for restoring state on startup.
     */
    scanForConfigs(notes: Note[]): void {
        const configNotes = notes.filter(n => n.tags.includes('@config:active'));
        if (configNotes.length > 0) {
            log('Config', `Found ${configNotes.length} active configuration notes. Restoring state...`);
            // Process in order (by priority or creation date? creation date for now)
            configNotes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            for (const note of configNotes) {
                this.processNote(note);
            }
        }
    }

    /**
     * Process a note to see if it is a configuration note.
     * If so, parse it and update the system configuration.
     */
    processNote(note: Note): void {
        if (note.tags.includes('@config:active')) {
            log('Config', `Processing configuration note: ${note.title}`);
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
            Capabilities.getInstance().set('browser', config.capabilities.browser);
        }

        if (config.capabilities?.files !== undefined && config.capabilities?.files !== this.currentConfig.capabilities?.files) {
            changes.push(`Files Capability: ${config.capabilities.files}`);
            Capabilities.getInstance().set('files', config.capabilities.files);
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
