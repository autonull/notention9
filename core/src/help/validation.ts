import type { HelpTopic, HelpStep } from '../types/help.js';

export function validateHelpTopic(topic: HelpTopic): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!topic.id || typeof topic.id !== 'string') {
    errors.push('Topic must have a string id');
  }

  if (!topic.title || typeof topic.title !== 'string') {
    errors.push('Topic must have a string title');
  }

  if (!topic.category || typeof topic.category !== 'string') {
    errors.push('Topic must have a string category');
  }

  if (!topic.description || typeof topic.description !== 'string') {
    errors.push('Topic must have a string description');
  }

  if (!['beginner', 'intermediate', 'advanced'].includes(topic.difficulty)) {
    errors.push('Topic difficulty must be beginner, intermediate, or advanced');
  }

  if (typeof topic.estimatedTimeMinutes !== 'number' || topic.estimatedTimeMinutes < 1) {
    errors.push('Topic must have estimatedTimeMinutes >= 1');
  }

  if (!Array.isArray(topic.tags)) {
    errors.push('Topic tags must be an array');
  }

  if (!Array.isArray(topic.steps) || topic.steps.length === 0) {
    errors.push('Topic must have at least one step');
  } else {
    for (let i = 0; i < topic.steps.length; i++) {
      const stepErrors = validateHelpStep(topic.steps[i], i);
      errors.push(...stepErrors);
    }
  }

  if (!Array.isArray(topic.relatedTopics)) {
    errors.push('Topic relatedTopics must be an array');
  }

  if (typeof topic.version !== 'number' || topic.version < 1) {
    errors.push('Topic version must be a number >= 1');
  }

  if (!topic.locale || typeof topic.locale !== 'string') {
    errors.push('Topic must have a locale string');
  }

  return { valid: errors.length === 0, errors };
}

function validateHelpStep(step: HelpStep, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Step ${index + 1}`;

  if (!step.id || typeof step.id !== 'string') {
    errors.push(`${prefix}: must have a string id`);
  }

  if (!['action', 'explanation', 'validation', 'choice', 'branching'].includes(step.type)) {
    errors.push(`${prefix}: type must be action, explanation, validation, choice, or branching`);
  }

  if (!step.title || typeof step.title !== 'string') {
    errors.push(`${prefix}: must have a string title`);
  }

  if (!step.description || typeof step.description !== 'string') {
    errors.push(`${prefix}: must have a string description`);
  }

  if (step.type === 'action') {
    if (!step.action) {
      errors.push(`${prefix}: action steps must have an action`);
    } else if (!['click', 'fill', 'hover', 'scroll', 'wait', 'navigate'].includes(step.action.type)) {
      errors.push(`${prefix}: action type must be click, fill, hover, scroll, wait, or navigate`);
    }
  }

  if (step.type === 'validation') {
    if (!step.validation) {
      errors.push(`${prefix}: validation steps must have a validation`);
    } else if (!['stateEquals', 'stateContains', 'elementVisible', 'elementExists', 'custom'].includes(step.validation.type)) {
      errors.push(`${prefix}: validation type must be stateEquals, stateContains, elementVisible, elementExists, or custom`);
    }
  }

  if (step.type === 'choice' || step.type === 'branching') {
    if (!Array.isArray(step.choices) || step.choices.length === 0) {
      errors.push(`${prefix}: choice/branching steps must have at least one choice`);
    }
  }

  if (step.spotlight) {
    if (typeof step.spotlight.enabled !== 'boolean') {
      errors.push(`${prefix}: spotlight.enabled must be boolean`);
    }
    if (!step.spotlight.target) {
      errors.push(`${prefix}: spotlight must have a target`);
    }
  }

  return errors;
}