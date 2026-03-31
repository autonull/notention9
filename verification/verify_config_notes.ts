import { ConfigSkill } from '../agent/src/skills/ConfigSkill.ts';
import { Note } from '@notention/core';

async function main() {
    console.log("Verifying Config Skill...");

    const updates: Record<string, any> = {};
    const updater = (k: string, v: any) => {
        console.log(`[MockUpdater] ${k} = ${v}`);
        updates[k] = v;
    };

    const skill = new ConfigSkill(updater);

    const testNote: Note = {
        id: 'config-note-1',
        title: 'System Config',
        content: 'Configure system settings',
        tags: ['config'],
        properties: [
            { key: 'llm_model', operator: 'is', values: ['gpt-5-turbo'] },
            { key: 'debug_mode', operator: 'is', values: ['true'] }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
        public: false,
        priority: 1
    };

    if (skill.canHandle(testNote) <= 0) {
        console.error("❌ Skill rejected the note.");
        process.exit(1);
    }

    console.log("Exporting actions...");
    const actionSeq = skill.exportToActions(testNote);
    console.log("Action Sequence:", JSON.stringify(actionSeq, null, 2));

    if (updates['llm_model'] === 'gpt-5-turbo' && updates['debug_mode'] === 'true') {
        console.log("✅ Config Skill correctly parsed updates via side-effect.");
    } else {
        console.error("❌ Config Skill failed to parse updates.");
        process.exit(1);
    }
}

main();
