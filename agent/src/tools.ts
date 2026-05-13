import { z } from 'zod';
import { Note, Tool, ToolInput, ToolResult, createTool, createOntologyQueryTool, Property, Skill as CoreSkill } from '@notention/core';
import { getSkillRegistry, getOntology } from './globals.js';
import { log } from './core/utils.js';
import { executeAction } from './core/actionExecutor.js';
import { SkillToolAdapter } from './skills/SkillToolAdapter.js';
import type { Skill as AgentSkill } from './skills/types.js';

type SkillLike = (CoreSkill | AgentSkill) & {
    export?: (note: Note) => Promise<any>;
    exportToActions?: (note: Note) => { actions: any[] };
    import?: (result: any) => Promise<Note[]>;
    importFromData?: (data: any, note: Note) => Note[];
};

interface SkillRegistryLike {
    findMatching(note: Note, minConfidence?: number): Promise<any[]>;
    get(skillId: string): SkillLike | undefined;
    getAll(): Array<{ skill: SkillLike }>;
}

interface QuerySkillRegistryInput {
    properties: Property[];
    minConfidence?: number;
}

interface ExecuteSkillInput {
    skillId: string;
    noteData: {
        properties: Property[];
        content: string;
    };
}

// Query skill registry
export const querySkillRegistryTool = createTool({
  name: 'query-skill-registry',
  description: 'Find skills matching note properties',
  schema: z.object({
    properties: z.array(z.object({
      key: z.string(),
      operator: z.string(),
      values: z.array(z.string())
    })),
    minConfidence: z.number().optional()
  }),
  execute: async (input) => {
    const { properties, minConfidence = 0.5 } = input as QuerySkillRegistryInput;
    const registry = getSkillRegistry() as unknown as SkillRegistryLike;
    const note: Partial<Note> = { properties };
    const matches = await registry.findMatching(note as Note, minConfidence);
    return { matches };
  }
}) as Tool;

// Execute skill
export const executeSkillTool = createTool({
  name: 'execute-skill',
  description: 'Execute a skill with note data',
  schema: z.object({
    skillId: z.string(),
    noteData: z.object({
      properties: z.array(z.any()),
      content: z.string()
    })
  }),
  execute: async (input) => {
    const { skillId, noteData } = input as ExecuteSkillInput;
    const registry = getSkillRegistry() as unknown as SkillRegistryLike;
    const skill = registry.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const note: Partial<Note> = noteData;
    let action: any = null;

    // Support both old 'export' and new 'exportToActions'
    const skillDef = skill as SkillLike & { exportToActions?: (note: Note) => { actions: any[] } };
    if (skillDef.exportToActions) {
      const sequence = skillDef.exportToActions(note as Note);
      if (sequence && sequence.actions && sequence.actions.length > 0) {
        action = SkillToolAdapter.convertToAgentAction(sequence.actions);
      }
    } else if ('export' in skill && typeof skill.export === 'function') {
      action = await skill.export(note as Note);
    }

    if (!action) {
      return { success: false, reason: 'No action generated' };
    }

    log('Tool', 'Executing action:', action);

    // Handle Macro Actions
    if (action.type === 'macro' && action.payload && action.payload.chain) {
      log('Tool', 'Executing Macro Chain:', action.payload.chain);
      const results = [];

      // Execute chain sequentially
      for (const stepName of action.payload.chain) {
        const stepSkill = registry.getAll().find((s) =>
          s.skill.name.toLowerCase() === stepName.toLowerCase() ||
          s.skill.id === stepName
        )?.skill;

        if (stepSkill && stepSkill.export) {
          log('Tool', `Macro Step: ${stepSkill.name}`);
          const stepAction = await stepSkill.export(note as Note);
          if (stepAction) {
            const stepResult = await executeAction(stepAction);
            const stepNotes = stepSkill.import ? await stepSkill.import(stepResult) : [];
            results.push(...stepNotes);
          }
        } else {
          log('Tool', `Macro Step Skipped: Skill '${stepName}' not found`);
        }
      }
      return results;
    }

    // Handle Prompt Actions (Phase 2.2)
    if (action.type === 'prompt' && action.payload && action.payload.prompt) {
      log('Tool', 'Executing Prompt Action:', action.payload.prompt.substring(0, 30));

      try {
        const { getAgentRegistry } = await import('./globals.js');
        const agent = getAgentRegistry().getDefault();

        if (agent && 'generateText' in agent && typeof agent.generateText === 'function') {
          const result = await agent.generateText(action.payload.prompt);
          return skill.import ? await skill.import([result]) : [];
        } else {
          return { success: false, reason: 'Agent does not support generation' };
        }
      } catch (e) {
        log('Tool', 'Prompt execution failed', e);
        return { success: false, reason: String(e) };
      }
    }

    // Execute the actual action (browser automation, API call, etc.)
    const results = await executeAction(action);

    if (skill.importFromData) {
      return skill.importFromData(results, note as Note);
    } else if (skill.import) {
      return await skill.import(results);
    }

    return [];
  }
}) as Tool;

// Ontology query tool
export const ontologyQueryTool = createOntologyQueryTool({
    getOntology: () => getOntology() as any
});
