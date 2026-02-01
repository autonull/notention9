import { Note } from '@notention/core';

export class ConfigProcessor {
  // Simple in-memory config store for now
  private config: Record<string, string> = {};

  async processNote(note: Note): Promise<void> {
    if (!note.content) return;

    // Regex to find config patterns like [@config:key:value]
    // Allowing flexible whitespace
    const configRegex = /\[@config:([^:]+):([^\]]+)\]/g;

    let match;
    while ((match = configRegex.exec(note.content)) !== null) {
        const key = match[1].trim();
        const value = match[2].trim();

        console.log(`[ConfigProcessor] Found config: ${key} = ${value}`);
        await this.applyConfig(key, value);
    }
  }

  private async applyConfig(key: string, value: string) {
      this.config[key] = value;

      // In a real system, this would dispatch events or update a central store
      // For now, we just log it as the "Action" part
      if (key === 'system.debug') {
          console.log(`[System] Debug mode set to ${value}`);
      }
      if (key.startsWith('skill.')) {
           console.log(`[Skill] Configuration update for ${key}: ${value}`);
      }
  }
}
