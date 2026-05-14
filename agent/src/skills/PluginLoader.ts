import fs from 'fs';
import path from 'path';
import { AgentSkillRegistry } from './AgentSkillRegistry.js';
import { log } from '../core/utils.js';

export class PluginLoader {
    private installedPath: string;

    constructor(private registry: AgentSkillRegistry) {
        this.installedPath = path.join(process.cwd(), 'src/skills/installed');
        this.ensureDirectory();
    }

    private async ensureDirectory() {
        try {
            await fs.promises.mkdir(this.installedPath, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }
    }

    async loadPlugins() {
        log('PluginLoader', 'Scanning for installed skills...');

        try {
            await this.ensureDirectory();
            const files = await fs.promises.readdir(this.installedPath);

            const pluginFiles = files.filter(file => file.endsWith('.ts') || file.endsWith('.js'));

            await Promise.all(pluginFiles.map(async (file) => {
                const pluginPath = path.join(this.installedPath, file);
                try {
                    // Dynamic import
                    const module = await import(pluginPath);

                    // Expect default export or named export 'Skill'
                    const SkillClass = module.default || module.Skill;

                    if (SkillClass && typeof SkillClass === 'function') {
                        const skillInstance = new SkillClass();
                        if (skillInstance.id && skillInstance.name) {
                            this.registry.register(skillInstance, {
                                tags: ['external', 'plugin'],
                                author: 'unknown'
                            });
                            log('PluginLoader', `Loaded external skill: ${skillInstance.name}`);
                        }
                    }
                } catch (e) {
                    log('PluginLoader', `Failed to load plugin ${file}`, e);
                }
            }));
        } catch (e) {
            log('PluginLoader', 'Error scanning directory', e);
        }
    }
}
