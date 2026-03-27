import { Note, AppSettings, parseConfigFromNote, mergeConfigs } from '@notention/core';
import { log } from '../core/utils';

export class ConfigProcessor {
    private currentConfig: Partial<AppSettings> = {};

    /**
     * Process a note to see if it is a configuration note.
     * If so, parse it and update the system configuration.
     */
    processNote(note: Note): void {
        if (note.tags.includes('@config:active')) {
            log('Config', `Detected active configuration note: ${note.title}`);
            const newConfig = parseConfigFromNote(note);

            // In a real system, we would broadcast this config change or apply it to the Agent instance.
            // For now, we log the detected changes.
            this.applyConfig(newConfig);
        }
    }

    private applyConfig(config: Partial<AppSettings>): void {
        // Calculate diff for logging using more modern syntax
        const changes = Object.entries({
            'Privacy Mode': config.privacyMode && config.privacyMode !== this.currentConfig.privacyMode ? config.privacyMode : undefined,
            'Browser Capability': config.capabilities?.browser !== this.currentConfig.capabilities?.browser ? config.capabilities?.browser : undefined,
            'Files Capability': config.capabilities?.files !== this.currentConfig.capabilities?.files ? config.capabilities?.files : undefined
        }).filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `${key}: ${value}`);

        if (changes.length > 0) {
            log('Config', `Applying configuration changes: ${changes.join(', ')}`);
        } else {
            log('Config', 'Configuration loaded (no changes or initial load)');
        }

        this.currentConfig = mergeConfigs(this.currentConfig as AppSettings, config);
    }

    getConfig(): Partial<AppSettings> {
        return this.currentConfig;
    }
}
