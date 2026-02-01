import { SkillRegistry, IndeedSkill } from '@notention/core';

class SkillService {
    private registry: SkillRegistry;

    constructor() {
        this.registry = new SkillRegistry();
        this.registerDefaultSkills();
    }

    private registerDefaultSkills() {
        // Register built-in skills
        try {
            const indeedSkill = new IndeedSkill();
            this.registry.registerSkill(indeedSkill);
            console.log('Registered IndeedSkill');
        } catch (e) {
            console.error('Failed to register skills', e);
        }
    }

    getRegistry(): SkillRegistry {
        return this.registry;
    }
}

export const skillService = new SkillService();
