import type { HelpTopic, HelpStep, InteractiveDemoConfig } from '../types/help.js';

export interface InteractiveExampleState {
  demoId: string | null;
  stepIndex: number;
  completedSteps: Set<string>;
  variables: Record<string, unknown>;
  mounted: boolean;
  error: string | null;
}

export interface InteractiveExampleEvents {
  onStepStart: (step: HelpStep, index: number) => void;
  onStepComplete: (step: HelpStep, index: number, success: boolean) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  onVariableChange: (name: string, value: unknown) => void;
}

export type InteractiveExampleListener<K extends keyof InteractiveExampleEvents> = 
  InteractiveExampleEvents[K];

export class InteractiveExample {
  private config: InteractiveDemoConfig | null = null;
  private state: InteractiveExampleState = {
    demoId: null,
    stepIndex: 0,
    completedSteps: new Set(),
    variables: {},
    mounted: false,
    error: null,
  };
  private listeners: Map<keyof InteractiveExampleEvents, Set<Function>> = new Map();
  private componentInstance: unknown = null;
  private cleanupFunctions: (() => void)[] = [];

  constructor() {
    for (const key of ['onStepStart', 'onStepComplete', 'onComplete', 'onError', 'onVariableChange'] as const) {
      this.listeners.set(key, new Set());
    }
  }

  async loadDemo(config: InteractiveDemoConfig): Promise<void> {
    this.config = config;
    this.state = {
      demoId: config.component,
      stepIndex: 0,
      completedSteps: new Set(),
      variables: { ...config.props },
      mounted: false,
      error: null,
    };

    try {
      await this.mountComponent();
      this.state.mounted = true;
      this.emit('onStepStart', config.validationSteps[0], 0);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emit('onError', this.state.error);
    }
  }

  private async mountComponent(): Promise<void> {
    if (!this.config) return;
    
    const container = document.getElementById(`interactive-demo-${this.config.component}`);
    if (!container) return;

    const { createElement } = await import('react');
    const { createRoot } = await import('react-dom/client');
    
    const Component = this.config.component;
    const props = this.config.props;
    
    const root = createRoot(container);
    root.render(createElement(Component, props));
    
    this.cleanupFunctions.push(() => {
      root.unmount();
    });
  }

  async start(): Promise<void> {
    if (!this.config || this.state.mounted === false) {
      throw new Error('Demo not loaded');
    }
    this.emit('onStepStart', this.config.validationSteps[0], 0);
  }

  async executeStep(stepIndex: number): Promise<{ success: boolean; error?: string }> {
    if (!this.config || stepIndex >= this.config.validationSteps.length) {
      return { success: false, error: 'Invalid step index' };
    }

    const step = this.config.validationSteps[stepIndex];
    this.state.stepIndex = stepIndex;
    this.emit('onStepStart', step, stepIndex);

    try {
      const success = await this.validateStep(step);
      
      if (success) {
        this.state.completedSteps.add(step.id);
        this.emit('onStepComplete', step, stepIndex, true);
        
        if (stepIndex === this.config.validationSteps.length - 1) {
          this.emit('onComplete');
        }
      } else {
        this.emit('onStepComplete', step, stepIndex, false);
      }
      
      return { success };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.emit('onError', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private async validateStep(step: HelpStep): Promise<boolean> {
    if (!step.validation) return true;

    const { type, statePath, expectedValue, target, customValidator } = step.validation;

    switch (type) {
      case 'stateEquals': {
        const actualValue = this.getVariable(statePath!);
        return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
      }
      case 'stateContains': {
        const actualValue = this.getVariable(statePath!);
        return Array.isArray(actualValue) && actualValue.includes(expectedValue);
      }
      case 'elementVisible': {
        const element = target ? document.querySelector(target.selector ?? `[data-testid="${target.testId}"]`) : null;
        return element !== null && (element as HTMLElement).offsetParent !== null;
      }
      case 'elementExists': {
        const element = target ? document.querySelector(target.selector ?? `[data-testid="${target.testId}"]`) : null;
        return element !== null;
      }
      case 'custom': {
        if (customValidator && this.state.variables[customValidator]) {
          const validator = this.state.variables[customValidator] as () => boolean;
          return validator();
        }
        return false;
      }
      default:
        return false;
    }
  }

  setVariable(name: string, value: unknown): void {
    this.state.variables[name] = value;
    this.emit('onVariableChange', name, value);
  }

  getVariable(name: string): unknown {
    return this.state.variables[name];
  }

  getState(): Readonly<InteractiveExampleState> {
    return this.state;
  }

  getConfig(): InteractiveDemoConfig | null {
    return this.config;
  }

  getProgress(): { current: number; total: number; percent: number } {
    if (!this.config) return { current: 0, total: 0, percent: 0 };
    return {
      current: this.state.stepIndex + 1,
      total: this.config.validationSteps.length,
      percent: ((this.state.stepIndex + 1) / this.config.validationSteps.length) * 100,
    };
  }

  subscribe<K extends keyof InteractiveExampleEvents>(
    event: K, 
    listener: InteractiveExampleListener<K>
  ): () => void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
    return () => {};
  }

  private emit<K extends keyof InteractiveExampleEvents>(
    event: K, 
    ...args: Parameters<InteractiveExampleEvents[K]>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as Function)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      }
    }
  }

  reset(): void {
    this.state = {
      demoId: null,
      stepIndex: 0,
      completedSteps: new Set(),
      variables: {},
      mounted: false,
      error: null,
    };
    this.config = null;
    this.componentInstance = null;
    
    for (const cleanup of this.cleanupFunctions) {
      cleanup();
    }
    this.cleanupFunctions = [];
  }

  destroy(): void {
    this.reset();
    for (const listeners of this.listeners.values()) {
      listeners.clear();
    }
  }
}

export function createInteractiveExample(): InteractiveExample {
  return new InteractiveExample();
}

export interface SandboxConfig {
  component: string;
  props: Record<string, unknown>;
  allowedProps?: string[];
  onChange?: (props: Record<string, unknown>) => void;
}

export class ComponentSandbox {
  private container: HTMLElement | null = null;
  private config: SandboxConfig | null = null;
  private root: unknown = null;

  async mount(container: HTMLElement, config: SandboxConfig): Promise<void> {
    this.container = container;
    this.config = config;
    await this.render();
  }

  private async render(): Promise<void> {
    if (!this.container || !this.config) return;

    const { createElement } = await import('react');
    const { createRoot } = await import('react-dom/client');
    
    const Component = this.config.component;
    const props = this.config.props;
    
    if (this.root) {
      (this.root as any).unmount();
    }
    
    this.root = createRoot(this.container);
    (this.root as any).render(createElement(Component, props));
  }

  updateProps(props: Record<string, unknown>): void {
    if (!this.config) return;
    
    this.config.props = { ...this.config.props, ...props };
    this.render();
    
    this.config.onChange?.(this.config.props);
  }

  getProps(): Record<string, unknown> {
    return this.config?.props ?? {};
  }

  unmount(): void {
    if (this.root) {
      (this.root as any).unmount();
      this.root = null;
    }
    this.container = null;
    this.config = null;
  }
}

export function createComponentSandbox(): ComponentSandbox {
  return new ComponentSandbox();
}