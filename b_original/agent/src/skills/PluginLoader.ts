import fs from 'fs';
import path from 'path';
import { AgentSkillRegistry } from './AgentSkillRegistry';
import { log } from '../core/utils';

export class PluginLoader {
    private installedPath: string;

    constructor(private registry: AgentSkillRegistry) {
        this.installedPath = path.join(process.cwd(), 'src/skills/installed');
        if (!fs.existsSync(this.installedPath)) {
            fs.mkdirSync(this.installedPath, { recursive: true });
        }
    }

    async loadPlugins() {
        log('PluginLoader', 'Scanning for installed skills...');

        try {
            const files = fs.readdirSync(this.installedPath);
            for (const file of files) {
                if (file.endsWith('.ts') || file.endsWith('.js')) {
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
                }
            }
        } catch (e) {
            log('PluginLoader', 'Error scanning directory', e);
        }
    }
}
