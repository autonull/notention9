export interface UIAdapter {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly extends?: string;  // Base adapter ID to extend

  // Component rendering
  render(componentName: string, props: Record<string, unknown>): HTMLElement | Promise<HTMLElement>;

  // Component registration
  registerComponent(name: string, component: ComponentConstructor): void;
  unregisterComponent(name: string): void;
  getComponent(name: string): ComponentConstructor | null;
  listComponents(): string[];

  // Variant support
  getVariants(componentName: string): string[];
  setVariant(componentName: string, variant: string): boolean;

  // Theme support
  getTheme(): ThemeConfig | null;
  setTheme(theme: ThemeConfig): void;

  // Lifecycle
  initialize(): void | Promise<void>;
  destroy(): void | Promise<void>;
}

export interface ComponentConstructor {
  new (props: Record<string, unknown>): ComponentInstance;
  displayName?: string;
  defaultProps?: Record<string, unknown>;
  variants?: Record<string, Partial<Record<string, unknown>>>;
}

export interface ComponentInstance {
  render(): HTMLElement;
  updateProps(props: Record<string, unknown>): void;
  destroy(): void;
}

export interface ThemeConfig {
  colors?: Record<string, string>;
  spacing?: Record<string, string>;
  typography?: Record<string, string>;
  borderRadius?: Record<string, string>;
  shadows?: Record<string, string>;
  breakpoints?: Record<string, string>;
  customProperties?: Record<string, string>;
}

export interface UIConfiguration {
  adapterId: string;
  components: Record<string, ComponentConfig>;
  flows: Record<string, FlowConfig>;
  theme?: ThemeConfig;
  metadata?: Record<string, unknown>;
}

export interface ComponentConfig {
  enabled: boolean;
  variant?: string;
  props: Record<string, unknown>;
  overrides?: Record<string, unknown>;
}

export interface FlowConfig {
  enabled: boolean;
  steps: FlowStep[];
  conditions?: Record<string, unknown>;
}

export interface FlowStep {
  component: string;
  action: string;
  params?: Record<string, unknown>;
  condition?: string;  // Expression to evaluate
}

export class UIRegistry {
  private adapters = new Map<string, UIAdapter>();
  private activeAdapterId: string | null = null;
  private defaultAdapterId: string | null = null;

  register(adapter: UIAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`UI Adapter '${adapter.id}' already registered`);
    }
    this.adapters.set(adapter.id, adapter);

    if (!this.defaultAdapterId) {
      this.defaultAdapterId = adapter.id;
    }
  }

  unregister(id: string): boolean {
    const adapter = this.adapters.get(id);
    if (!adapter) return false;

    if (this.activeAdapterId === id) {
      this.activeAdapterId = this.defaultAdapterId ?? null;
    }

    adapter.destroy();
    return this.adapters.delete(id);
  }

  get(id: string): UIAdapter | undefined {
    return this.adapters.get(id);
  }

  getActive(): UIAdapter | null {
    if (!this.activeAdapterId) return null;
    return this.adapters.get(this.activeAdapterId) ?? null;
  }

  setActive(id: string): boolean {
    if (!this.adapters.has(id)) return false;
    this.activeAdapterId = id;
    return true;
  }

  getActiveId(): string | null {
    return this.activeAdapterId;
  }

  list(): UIAdapter[] {
    return Array.from(this.adapters.values());
  }

  listIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  getDefault(): UIAdapter | null {
    if (!this.defaultAdapterId) return null;
    return this.adapters.get(this.defaultAdapterId) ?? null;
  }

  setDefault(id: string): boolean {
    if (!this.adapters.has(id)) return false;
    this.defaultAdapterId = id;
    if (!this.activeAdapterId) {
      this.activeAdapterId = id;
    }
    return true;
  }
}

export const uiRegistry = new UIRegistry();