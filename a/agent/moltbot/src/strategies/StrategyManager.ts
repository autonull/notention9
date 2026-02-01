import { NoteTranslationStrategy, TranslationContext, ClawdBotAction, ClawdBotConfiguration } from './NoteTranslationStrategy';

export class StrategyManager {
  private strategies: NoteTranslationStrategy[] = [];

  /**
   * Register a new translation strategy
   */
  registerStrategy(strategy: NoteTranslationStrategy): void {
    this.strategies.push(strategy);
    // Sort strategies by priority (highest first)
    this.strategies.sort((a, b) => b.getPriority() - a.getPriority());
    console.log(`Registered translation strategy: ${strategy.getName()} (priority: ${strategy.getPriority()})`);
  }

  /**
   * Unregister a translation strategy
   */
  unregisterStrategy(name: string): void {
    const index = this.strategies.findIndex(s => s.getName() === name);
    if (index !== -1) {
      this.strategies.splice(index, 1);
      console.log(`Unregistered translation strategy: ${name}`);
    }
  }

  /**
   * Find the best strategy to handle a given note
   */
  findBestStrategy(note: any): NoteTranslationStrategy | null {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(note)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Translate a note using the best available strategy
   */
  async translateNote(context: TranslationContext): Promise<(ClawdBotAction | ClawdBotConfiguration)[] | null> {
    const strategy = this.findBestStrategy(context.note);

    if (!strategy) {
      console.log(`No strategy found to handle note: ${context.note.id}`);
      return null;
    }

    console.log(`Using strategy "${strategy.getName()}" to translate note: ${context.note.id}`);

    try {
      const result = await strategy.translate(context);

      if (Array.isArray(result)) {
        return result;
      } else {
        return [result]; // Wrap single configuration in array
      }
    } catch (error) {
      console.error(`Error translating note with strategy "${strategy.getName()}":`, error);
      return null;
    }
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): NoteTranslationStrategy[] {
    return [...this.strategies]; // Return a copy
  }

  /**
   * Get strategy by name
   */
  getStrategyByName(name: string): NoteTranslationStrategy | undefined {
    return this.strategies.find(s => s.getName() === name);
  }
}