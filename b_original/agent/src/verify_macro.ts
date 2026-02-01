
import { AgentSkillRegistry } from './skills/AgentSkillRegistry';
import { MacroManager } from './skills/MacroManager';
import { Note } from '@notention/core/src/types';

async function verifyMacro() {
    console.log('🧪 Verifying Macro Skills...');

    const registry = new AgentSkillRegistry();
    const manager = new MacroManager(registry);

    // 1. Create a Note causing definition
    const defNote = {
        id: 'def-1',
        content: '# Recruitment Plan\n[skill:Recruit] = [skill:Indeed Job Search] -> [skill:GitHub Repository Search]',
        tags: ['@config'],
        timestamp: Date.now()
    } as unknown as Note;

    console.log('Processing definition note...');
    manager.processNote(defNote);

    // 2. Check Registry
    const skills = registry.getAll();
    const macro = skills.find(s => s.skill.name === 'Recruit');

    if (macro) {
        console.log(`✅ Macro "Recruit" registered with ID: ${macro.skill.id}`);

        // 3. Test Export
        const execNote = {
            id: 'exec-1',
            content: 'Find react developers',
            tags: [],
            timestamp: Date.now()
        } as unknown as Note;

        const action = await macro.skill.export(execNote);
        if (action?.type === 'macro' && action.payload?.chain?.length === 2) {
            console.log('✅ Macro export successful');
            console.log('Chain:', action.payload.chain);
        } else {
            console.error('❌ Macro export failed', action);
        }

    } else {
        console.error('❌ Macro registration failed');
        console.log('Current skills:', skills.map(s => s.skill.name));
    }
}

verifyMacro();
