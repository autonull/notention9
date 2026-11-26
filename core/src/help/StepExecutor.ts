import type { HelpTopic, HelpStep, HelpAction, HelpValidation, HelpTarget, SpotlightConfig } from '../types/help.js';
import { HelpEngine } from './HelpEngine.js';

export interface StepExecutionContext {
  currentStepIndex: number;
  completedSteps: Set<string>;
  stepAttempts: Record<string, number>;
  variables: Record<string, unknown>;
  onSpotlight?: (config: SpotlightConfig) => void;
  onAutoAdvance?: () => void;
  onStepComplete?: (stepId: string, success: boolean) => void;
  getState?: (path: string) => unknown;
  findElement?: (target: HelpTarget) => HTMLElement | null;
}

export interface StepResult {
  success: boolean;
  nextStepIndex?: number;
  error?: string;
  shouldAutoAdvance: boolean;
}

export class StepExecutor {
  private engine: HelpEngine;
  private context: StepExecutionContext;
  private currentTopic: HelpTopic | null = null;
  private abortController: AbortController | null = null;

  constructor(engine: HelpEngine, context: Partial<StepExecutionContext> = {}) {
    this.engine = engine;
    this.context = {
      currentStepIndex: 0,
      completedSteps: new Set(),
      stepAttempts: {},
      variables: {},
      ...context,
    };
  }

  async startTopic(topicId: string): Promise<{ success: boolean; error?: string }> {
    const topic = this.engine.getTopic(topicId);
    if (!topic) {
      return { success: false, error: `Topic not found: ${topicId}` };
    }

    this.currentTopic = topic;
    this.context.currentStepIndex = 0;
    this.context.completedSteps.clear();
    this.context.stepAttempts = {};
    this.abortController = new AbortController();

    return { success: true };
  }

  async executeCurrentStep(): Promise<StepResult> {
    if (!this.currentTopic) {
      return { success: false, error: 'No topic started', shouldAutoAdvance: false };
    }

    const step = this.currentTopic.steps[this.context.currentStepIndex];
    if (!step) {
      return { success: false, error: 'No more steps', shouldAutoAdvance: false };
    }

    this.context.stepAttempts[step.id] = (this.context.stepAttempts[step.id] || 0) + 1;

    try {
      let result: StepResult;

      switch (step.type) {
        case 'action':
          result = await this.executeAction(step);
          break;
        case 'explanation':
          result = await this.executeExplanation(step);
          break;
        case 'validation':
          result = await this.executeValidation(step);
          break;
        case 'choice':
          result = await this.executeChoice(step);
          break;
        case 'branching':
          result = await this.executeBranching(step);
          break;
        default:
          result = { success: false, error: `Unknown step type: ${step.type}`, shouldAutoAdvance: false };
      }

      if (result.success) {
        this.context.completedSteps.add(step.id);
        this.context.onStepComplete?.(step.id, true);
        
        if (step.autoAdvance || result.shouldAutoAdvance) {
          this.context.onAutoAdvance?.();
        }
      } else {
        this.context.onStepComplete?.(step.id, false);
      }

      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error), 
        shouldAutoAdvance: false 
      };
    }
  }

  async nextStep(): Promise<StepResult> {
    if (!this.currentTopic) {
      return { success: false, error: 'No topic started', shouldAutoAdvance: false };
    }

    this.context.currentStepIndex++;
    
    if (this.context.currentStepIndex >= this.currentTopic.steps.length) {
      return { success: true, shouldAutoAdvance: false }; // Topic complete
    }

    return this.executeCurrentStep();
  }

  async previousStep(): Promise<StepResult> {
    if (!this.currentTopic) {
      return { success: false, error: 'No topic started', shouldAutoAdvance: false };
    }

    this.context.currentStepIndex = Math.max(0, this.context.currentStepIndex - 1);
    return this.executeCurrentStep();
  }

  async jumpToStep(stepId: string): Promise<StepResult> {
    if (!this.currentTopic) {
      return { success: false, error: 'No topic started', shouldAutoAdvance: false };
    }

    const index = this.currentTopic.steps.findIndex(s => s.id === stepId);
    if (index === -1) {
      return { success: false, error: `Step not found: ${stepId}`, shouldAutoAdvance: false };
    }

    this.context.currentStepIndex = index;
    return this.executeCurrentStep();
  }

  getCurrentStep(): HelpStep | null {
    if (!this.currentTopic) return null;
    return this.currentTopic.steps[this.context.currentStepIndex] ?? null;
  }

  getProgress(): { current: number; total: number; percent: number } {
    if (!this.currentTopic) return { current: 0, total: 0, percent: 0 };
    return {
      current: this.context.currentStepIndex + 1,
      total: this.currentTopic.steps.length,
      percent: ((this.context.currentStepIndex + 1) / this.currentTopic.steps.length) * 100,
    };
  }

  getContext(): Readonly<StepExecutionContext> {
    return this.context;
  }

  abort(): void {
    this.abortController?.abort();
  }

  private async executeAction(step: HelpStep): Promise<StepResult> {
    if (!step.action) {
      return { success: false, error: 'No action defined', shouldAutoAdvance: false };
    }

    const { type, value, options } = step.action;

    switch (type) {
      case 'click': {
        const element = this.context.findElement?.(step.target!);
        if (element) {
          element.click();
          return { success: true, shouldAutoAdvance: true };
        }
        return { success: false, error: 'Element not found', shouldAutoAdvance: false };
      }
      case 'fill': {
        const element = this.context.findElement?.(step.target!) as HTMLInputElement | HTMLTextAreaElement | null;
        if (element) {
          element.value = value ?? '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, shouldAutoAdvance: true };
        }
        return { success: false, error: 'Element not found', shouldAutoAdvance: false };
      }
      case 'hover': {
        const element = this.context.findElement?.(step.target!);
        if (element) {
          element.dispatchEvent(new Event('mouseenter', { bubbles: true }));
          return { success: true, shouldAutoAdvance: true };
        }
        return { success: false, error: 'Element not found', shouldAutoAdvance: false };
      }
      case 'scroll': {
        const element = this.context.findElement?.(step.target!);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return { success: true, shouldAutoAdvance: true };
        }
        return { success: false, error: 'Element not found', shouldAutoAdvance: false };
      }
      case 'wait': {
        const duration = options?.duration as number ?? 1000;
        await new Promise(resolve => setTimeout(resolve, duration));
        return { success: true, shouldAutoAdvance: true };
      }
      case 'navigate': {
        const url = value as string;
        if (url.startsWith('#')) {
          window.location.hash = url;
        } else {
          window.location.href = url;
        }
        return { success: true, shouldAutoAdvance: true };
      }
      default:
        return { success: false, error: `Unknown action type: ${type}`, shouldAutoAdvance: false };
    }
  }

  private async executeExplanation(step: HelpStep): Promise<StepResult> {
    if (step.spotlight) {
      this.context.onSpotlight?.(step.spotlight);
    }
    return { success: true, shouldAutoAdvance: false };
  }

  private async executeValidation(step: HelpStep): Promise<StepResult> {
    if (!step.validation) {
      return { success: false, error: 'No validation defined', shouldAutoAdvance: false };
    }

    const { type, statePath, expectedValue, target, customValidator } = step.validation;

    switch (type) {
      case 'stateEquals': {
        const actualValue = this.context.getState?.(statePath!);
        const success = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
        return { success, shouldAutoAdvance: success, error: success ? undefined : `Expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}` };
      }
      case 'stateContains': {
        const actualValue = this.context.getState?.(statePath!);
        const success = Array.isArray(actualValue) && actualValue.includes(expectedValue);
        return { success, shouldAutoAdvance: success, error: success ? undefined : `Expected array to contain ${JSON.stringify(expectedValue)}` };
      }
      case 'elementVisible': {
        const element = this.context.findElement?.(target!);
        const success = element !== null && element !== undefined && element.offsetParent !== null;
        return { success, shouldAutoAdvance: success, error: success ? undefined : 'Element not visible' };
      }
      case 'elementExists': {
        const element = this.context.findElement?.(target!);
        const success = element !== null && element !== undefined;
        return { success, shouldAutoAdvance: success, error: success ? undefined : 'Element not found' };
      }
      case 'custom': {
        if (customValidator && this.context.variables[customValidator]) {
          const validator = this.context.variables[customValidator] as (ctx: StepExecutionContext) => boolean;
          const success = validator(this.context);
          return { success, shouldAutoAdvance: success, error: success ? undefined : 'Custom validation failed' };
        }
        return { success: false, error: 'Custom validator not found', shouldAutoAdvance: false };
      }
      default:
        return { success: false, error: `Unknown validation type: ${type}`, shouldAutoAdvance: false };
    }
  }

  private async executeChoice(step: HelpStep): Promise<StepResult> {
    if (!step.choices || step.choices.length === 0) {
      return { success: false, error: 'No choices defined', shouldAutoAdvance: false };
    }

    return { 
      success: true, 
      shouldAutoAdvance: false,
      nextStepIndex: undefined // Wait for user choice
    };
  }

  private async executeBranching(step: HelpStep): Promise<StepResult> {
    if (!step.choices || step.choices.length === 0) {
      return { success: false, error: 'No branches defined', shouldAutoAdvance: false };
    }

    for (const choice of step.choices) {
      if (choice.condition) {
        try {
          const result = new Function('ctx', `return ${choice.condition}`)(this.context);
          if (result) {
            const targetIndex = this.currentTopic!.steps.findIndex(s => s.id === choice.nextStepId);
            if (targetIndex !== -1) {
              return { success: true, nextStepIndex: targetIndex, shouldAutoAdvance: true };
            }
          }
        } catch {
          // Condition evaluation failed, continue to next choice
        }
      }
    }

    return { success: false, error: 'No branch condition matched', shouldAutoAdvance: false };
  }
}

export function createStepExecutor(engine: HelpEngine, context?: Partial<StepExecutionContext>): StepExecutor {
  return new StepExecutor(engine, context);
}