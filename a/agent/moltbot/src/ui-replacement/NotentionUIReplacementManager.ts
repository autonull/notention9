import {
  UIReplacementComponent,
  UIReplacementContext,
  UIInteraction,
  UIReplacementManager,
  FunctionalityMetaphor,
  NotentionConcept,
  NotentionAction
} from './UIReplacementInterfaces';

export class NotentionUIReplacementManager implements UIReplacementManager {
  private components: Map<string, UIReplacementComponent> = new Map();

  registerComponent(component: UIReplacementComponent): void {
    this.components.set(component.id, component);
    console.log(`Registered UI replacement component: ${component.name}`);
  }

  unregisterComponent(id: string): boolean {
    const removed = this.components.delete(id);
    if (removed) {
      console.log(`Unregistered UI replacement component: ${id}`);
    }
    return removed;
  }

  getComponents(context: UIReplacementContext): UIReplacementComponent[] {
    // Get all components that should be displayed in this context
    const applicableComponents = Array.from(this.components.values())
      .filter(comp => comp.enabled && comp.shouldDisplay(context))
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    return applicableComponents;
  }

  renderAll(context: UIReplacementContext): string[] {
    const components = this.getComponents(context);
    const renderedElements: string[] = [];

    for (const component of components) {
      try {
        const element = component.render(context);
        if (element) {
          renderedElements.push(element);
        }
      } catch (error) {
        console.error(`Error rendering component ${component.id}:`, error);
      }
    }

    return renderedElements;
  }

  handleInteraction(interaction: UIInteraction): void {
    const component = this.components.get(interaction.componentId);
    if (component) {
      try {
        component.handleInteraction(interaction);
      } catch (error) {
        console.error(`Error handling interaction for component ${interaction.componentId}:`, error);
      }
    } else {
      console.warn(`Component not found for interaction: ${interaction.componentId}`);
    }
  }

  getAllComponents(): UIReplacementComponent[] {
    return Array.from(this.components.values());
  }
}