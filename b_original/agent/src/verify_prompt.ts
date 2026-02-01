
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';
import { MacroManager } from './skills/MacroManager';
import { Note } from '@notention/core/src/types';
import { DynamicPromptSkill } from './skills/MacroManager';

async function verifyPrompt() {
    console.log('🧪 Verifying Prompt Skills...');

    const registry = new AgentSkillRegistry();
    const manager = new MacroManager(registry);

    // 1. Create a Note causing definition
    const defNote = {
        id: 'def-prompt-1',
        content: '# Config\n[skill:Poet] = "Write a haiku about code"',
        tags: ['@config'],
        timestamp: Date.now()
    } as unknown as Note;

    console.log('Processing prompt definition note...');
    manager.processNote(defNote);

    // 2. Check Registry
    const skills = registry.getAll();
    const skillMeta = skills.find(s => s.skill.name === 'Poet');

    if (skillMeta) {
        console.log(`✅ Prompt Skill "Poet" registered with ID: ${skillMeta.skill.id}`);

        // 3. Test Export
        const execNote = {
            id: 'exec-prompt-1',
            content: 'typescript bugs',
            tags: [],
            timestamp: Date.now()
        } as unknown as Note;

        const action = await skillMeta.skill.export(execNote);

        if (action?.type === 'prompt' && action.payload?.prompt) {
            console.log('✅ Prompt export successful');
            console.log('Prompt:', action.payload.prompt);

            if (action.payload.prompt.includes('Write a haiku') && action.payload.prompt.includes('typescript bugs')) {
                console.log('✅ Prompt composition correct');
            } else {
                console.error('❌ Prompt composition failed');
            }

        } else {
            console.error('❌ Prompt export failed', action);
        }

    } else {
        console.error('❌ Prompt registration failed');
        console.log('Current skills:', skills.map(s => s.skill.name));
    }
}

verifyPrompt();
