import { NoteSkillLoader } from '../agent/src/skills/NoteSkillLoader.ts';
import { AgentSkillRegistry } from '../agent/src/skills/AgentSkillRegistry.ts';
import type { Note } from '@notention/core';

// Mock Registry
class MockRegistry extends AgentSkillRegistry {
    public registered: any[] = [];
    register(skill: any, meta: any) {
        this.registered.push({ skill, meta });
        console.log(`[MockRegistry] Registered ${skill.name}`);
    }
}

async function main() {
    console.log("Starting Dynamic Skill Verification...");

    const registry = new MockRegistry();
    const loader = new NoteSkillLoader(registry);

    // Create a mock Skill Note
    // Syntax:
    // [skill:id:hello-world]
    // [skill:trigger:tag:greet]
    const skillNote: Note = {
        id: 'note-skill-1',
        title: 'Hello World Skill',
        content: `
This note defines a greeting skill.

\`\`\`json
{
    "name": "Hello World",
    "description": "Says hello",
    "action": {
        "type": "prompt",
        "payload": {
            "prompt": "Say hello to {{content}}"
        }
    }
}
\`\`\`
        `,
        tags: ['@skill:definition'],
        properties: [
            { key: 'skill:id', operator: 'is', values: ['hello-world'] },
            { key: 'skill:trigger:tag', operator: 'is', values: ['greet'] }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
        public: false,
        priority: 1
    };

    console.log("Scanning for skills...");
    loader.scanForSkills([skillNote]);

    if (registry.registered.length === 1) {
        const entry = registry.registered[0];
        console.log("✅ Skill Registered:", entry.skill.name);

        if (entry.skill.id === 'hello-world') {
            console.log("✅ Skill ID match");
        } else {
            throw new Error(`Skill ID mismatch: ${entry.skill.id}`);
        }

        // Verify Trigger Logic
        const testNote: Note = {
            id: 'trigger-test',
            title: 'Greeting Request',
            content: 'User 123',
            tags: ['greet'],
            properties: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: { type: 'user', identifier: 'test', timestamp: Date.now() },
            public: false,
            priority: 1
        };

        const score = entry.skill.canHandle(testNote);
        console.log(`Can Handle Score: ${score}`);
        if (score >= 0.5) {
            console.log("✅ Skill trigger match");
        } else {
            throw new Error("Skill failed to trigger on matching note");
        }

        // Verify Export Logic (Prompt Substitution)
        // We use exportToActions (modern) or export (legacy)
        const actions = entry.skill.exportToActions(testNote);
        const payload = (actions as any).customAction.payload;

        console.log("Action Payload:", payload);
        if (payload.prompt === "Say hello to User 123") {
            console.log("✅ Prompt substitution correct");
        } else {
            throw new Error(`Prompt substitution failed: ${payload.prompt}`);
        }

    } else {
        throw new Error(`Expected 1 registered skill, found ${registry.registered.length}`);
    }
}

main().catch(e => {
    console.error("Verification Failed:", e);
    process.exit(1);
});
