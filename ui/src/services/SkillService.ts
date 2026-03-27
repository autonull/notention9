import { SkillRegistry, IndeedSkill, ReminderSkill, Logger } from '@notention/core';

class SkillService {
    private registry: SkillRegistry;
    private logger = Logger.getInstance();

    constructor() {
        this.registry = new SkillRegistry();
        this.registerDefaultSkills();
    }

    private registerDefaultSkills() {
        // Register built-in skills
        try {
            this.registry.registerSkill(new IndeedSkill());
            this.registry.registerSkill(new ReminderSkill());
            this.logger.info('Registered Default Skills');
        } catch (e) {
            this.logger.error('Failed to register skills', e as Error);
        }
    }

    getRegistry(): SkillRegistry {
        return this.registry;
    }
}

export const skillService = new SkillService();
