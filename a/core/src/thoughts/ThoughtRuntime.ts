import { Note, Thought, ThoughtIntent, ThoughtSovereignty, VoltAgentState } from '../types/index.js';

/**
 * ThoughtRuntime wraps a Note to provide the Phase 5 "Thought" interface.
 * This is a runtime abstraction, not a database migration.
 */
export class ThoughtRuntime {
  static fromNote(note: Note): Thought {
    // Infer state from Note properties or metadata
    const intent = ThoughtRuntime.inferIntent(note);
    const sovereignty = ThoughtRuntime.inferSovereignty(note);
    const voltState = ThoughtRuntime.inferVoltState(note);

    return {
      id: note.id,
      intent,
      sovereignty,
      volt_agent_state: voltState,
      source_note: note
    };
  }

  private static inferIntent(note: Note): ThoughtIntent {
    if (note.deletedAt) return 'archived';
    if (note.tags.includes('#plan') || note.tags.includes('#todo')) return 'planning';
    if (note.tags.includes('#active') || note.tags.includes('#doing')) return 'executing';
    return 'fleeting';
  }

  private static inferSovereignty(note: Note): ThoughtSovereignty {
    // If tagged public or has a nostr event ID, it's shared
    if (note.public || note.nostrEventId) return 'shared';
    // If tagged for sync but no ID yet
    if (note.tags.includes('#sync')) return 'pending_sync';
    return 'local';
  }

  private static inferVoltState(note: Note): VoltAgentState {
    const statusProp = note.properties.find(p => p.key === 'volt.status');
    if (statusProp && statusProp.values.length > 0) {
        const val = statusProp.values[0] as VoltAgentState;
        if (['idle', 'demonstrating', 'acting', 'blocked'].includes(val)) {
            return val;
        }
    }
    return 'idle';
  }

  static toNoteOverrides(thought: Thought): Partial<Note> {
      // Convert state back to Note properties/tags if needed
      // This is for persistence
      return {
          // e.g. updating tags based on intent transition
      };
  }
}
