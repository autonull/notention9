import { SkillRegistry, IndeedSkill, ReminderSkill } from '@notention/core';

class SkillService {
    private registry: SkillRegistry;

    constructor() {
        this.registry = new SkillRegistry();
        this.registerDefaultSkills();
    }

    private registerDefaultSkills() {
        // Register built-in skills
        try {
            this.registry.registerSkill(new IndeedSkill());
            this.registry.registerSkill(new ReminderSkill());
            console.log('Registered Default Skills');
        } catch (e) {
            console.error('Failed to register skills', e);
        }
    }

    getRegistry(): SkillRegistry {
        return this.registry;
    }
}

export const skillService = new SkillService();
