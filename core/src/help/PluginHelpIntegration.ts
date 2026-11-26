import type { Skill } from '../skills/types.js';
import type { HelpTopic, HelpStep } from '../types/help.js';
import { SkillRegistry } from '../skills/SkillRegistry.js';
import { skillApprovalManager } from '../skills/skillApprovalManager.js';

export interface PluginHelpConfig {
  skillRegistry: SkillRegistry;
  includeSkillApprovalInfo: boolean;
  includeUsageExamples: boolean;
}

export class PluginHelpIntegration {
  private config: PluginHelpConfig;
  private generatedTopics: Map<string, HelpTopic> = new Map();

  constructor(config: Partial<PluginHelpConfig> = {}) {
    this.config = {
      skillRegistry: config.skillRegistry ?? new SkillRegistry(),
      includeSkillApprovalInfo: config.includeSkillApprovalInfo ?? true,
      includeUsageExamples: config.includeUsageExamples ?? true,
    };
  }

  generateSkillHelpTopic(skill: Skill): HelpTopic {
    const topicId = `skill-${skill.id}`;
    
    if (this.generatedTopics.has(topicId)) {
      return this.generatedTopics.get(topicId)!;
    }

    const steps: HelpStep[] = [
      {
        id: 'step-1',
        type: 'explanation',
        title: `What is ${skill.name}?`,
        description: skill.description,
      },
    ];

    if (this.config.includeUsageExamples) {
      steps.push({
        id: 'step-2',
        type: 'explanation',
        title: 'How to use this skill',
        description: this.generateUsageDescription(skill),
      });
    }

    if (this.config.includeSkillApprovalInfo) {
      steps.push({
        id: this.config.includeUsageExamples ? 'step-3' : 'step-2',
        type: 'explanation',
        title: 'Skill approval required',
        description: 'Before this skill can automatically execute on matching notes, you must approve it. When a matching note is detected, you will be prompted to approve the skill. Once approved, it will automatically execute for similar notes in the future.',
      });
    }

    const topic: HelpTopic = {
      id: topicId,
      title: `${skill.name} Skill`,
      category: 'plugins-skills',
      description: `Learn how to use the ${skill.name} skill (${skill.description})`,
      difficulty: 'intermediate',
      estimatedTimeMinutes: 3,
      tags: ['skill', 'plugin', 'automation', ...(skill.metadata?.domains ?? [])],
      steps,
      relatedTopics: ['skills-and-ontology', 'automation-basics', 'agent-capabilities'],
      version: 1,
      locale: 'en',
    };

    this.generatedTopics.set(topicId, topic);
    return topic;
  }

  private generateUsageDescription(skill: Skill): string {
    const domains = skill.metadata?.domains ?? [];
    const domainText = domains.length > 0 ? ` (works with ${domains.join(', ')})` : '';
    const authText = skill.metadata?.requiresAuth ? ' Requires authentication.' : '';
    
    return (
      `This skill${domainText} can automatically process notes that match its patterns. ` +
      `When you create a note with the required properties, ${skill.name} will detect it and ` +
      `offer to execute.${authText} ` +
      `You can also manually trigger it from the note actions menu.`
    );
  }

  generateAllSkillTopics(): HelpTopic[] {
    const skills = this.config.skillRegistry.getAllSkills()
      .filter((skill): skill is Skill => 'canHandle' in skill && typeof skill.canHandle === 'function');
    
    return skills.map(skill => this.generateSkillHelpTopic(skill));
  }

  generateSkillApprovalTopic(): HelpTopic {
    const topicId = 'skill-approval-process';
    
    if (this.generatedTopics.has(topicId)) {
      return this.generatedTopics.get(topicId)!;
    }

    const topic: HelpTopic = {
      id: topicId,
      title: 'Skill Approval Process',
      category: 'plugins-skills',
      description: 'Understanding how skill approval works in Notention',
      difficulty: 'beginner',
      estimatedTimeMinutes: 4,
      tags: ['skill', 'approval', 'automation', 'privacy'],
      steps: [
        {
          id: 'step-1',
          type: 'explanation',
          title: 'Why skills need approval',
          description: 'Skills can interact with external services and APIs. To protect your privacy and data, Notention requires one-time approval before any skill can automatically execute on your notes.',
        },
        {
          id: 'step-2',
          type: 'explanation',
          title: 'When approval is requested',
          description: 'When you create a note that matches a skill\'s pattern, you\'ll see a prompt asking for approval. The prompt shows the skill name, what triggered it, and what actions it will perform.',
        },
        {
          id: 'step-3',
          type: 'explanation',
          title: 'Managing approvals',
          description: 'You can view and revoke skill approvals in Settings > Skills > Approved Skills. Revoking approval means the skill will ask for permission again next time it matches a note.',
        },
        {
          id: 'step-4',
          type: 'action',
          title: 'View approved skills',
          description: 'Open Settings to see your currently approved skills',
          target: { testId: 'settings-skills-tab' },
          action: { type: 'click' },
          autoAdvance: true,
        },
        {
          id: 'step-5',
          type: 'validation',
          title: 'Approved skills listed',
          description: 'Verify you can see the list of approved skills and revoke any if needed',
          validation: { type: 'elementExists', target: { testId: 'approved-skills-list' } },
        },
      ],
      relatedTopics: ['skills-and-ontology', 'automation-basics', 'agent-capabilities'],
      version: 1,
      locale: 'en',
    };

    this.generatedTopics.set(topicId, topic);
    return topic;
  }

  generatePluginReadmeTopic(pluginId: string, readmeContent: string, metadata: { name: string; description: string; version: string; author?: string }): HelpTopic {
    const topicId = `plugin-${pluginId}`;
    
    if (this.generatedTopics.has(topicId)) {
      return this.generatedTopics.get(topicId)!;
    }

    const topic: HelpTopic = {
      id: topicId,
      title: `${metadata.name} Plugin`,
      category: 'plugins-skills',
      description: metadata.description,
      difficulty: 'intermediate',
      estimatedTimeMinutes: 5,
      tags: ['plugin', 'integration', pluginId],
      steps: [
        {
          id: 'step-1',
          type: 'explanation',
          title: `About ${metadata.name}`,
          description: metadata.description,
        },
        {
          id: 'step-2',
          type: 'explanation',
          title: 'Documentation',
          description: readmeContent.slice(0, 2000) + (readmeContent.length > 2000 ? '...' : ''),
        },
        {
          id: 'step-3',
          type: 'explanation',
          title: 'Version & Author',
          description: `Version: ${metadata.version}${metadata.author ? `\nAuthor: ${metadata.author}` : ''}`,
        },
      ],
      relatedTopics: ['skills-and-ontology', 'automation-basics'],
      version: 1,
      locale: 'en',
    };

    this.generatedTopics.set(topicId, topic);
    return topic;
  }

  getGeneratedTopics(): HelpTopic[] {
    return Array.from(this.generatedTopics.values());
  }

  clearCache(): void {
    this.generatedTopics.clear();
  }
}

export const pluginHelpIntegration = new PluginHelpIntegration();