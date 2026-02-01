import fs from 'fs';
import { join } from 'path';
import { Note } from '@notention/core/src/types';
import { Mutex } from './utils/Mutex';

const DATA_DIR = join(process.cwd(), 'data');
const NOTES_FILE = join(DATA_DIR, 'notes.json');
const persistenceMutex = new Mutex();

export class PersistenceService {
    static async ensureDataDir() {
        try {
            await fs.promises.mkdir(DATA_DIR, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }
    }

    static async loadNotes(): Promise<Note[]> {
        await this.ensureDataDir();
        try {
            const data = await fs.promises.readFile(NOTES_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    static async saveNotes(notes: Note[]): Promise<void> {
        await this.ensureDataDir();
        const tempFile = `${NOTES_FILE}.tmp`;
        try {
            await fs.promises.writeFile(tempFile, JSON.stringify(notes, null, 2));
            await fs.promises.rename(tempFile, NOTES_FILE);
        } catch (error) {
            console.error('Failed to save notes atomically', error);
            try {
                await fs.promises.unlink(tempFile);
            } catch (e) {
                // Ignore unlink error
            }
            throw error;
        }
    }

    static async getNotesSafe(): Promise<Note[]> {
        return persistenceMutex.dispatch(() => this.loadNotes());
    }

    static async saveNoteSafe(note: Note): Promise<void> {
         return persistenceMutex.dispatch(async () => {
            const allNotes = await this.loadNotes();
            const index = allNotes.findIndex((n) => n.id === note.id);
            if (index >= 0) {
              allNotes[index] = note;
            } else {
              allNotes.push(note);
            }
            await this.saveNotes(allNotes);
          });
    }

    static async deleteNoteSafe(id: string): Promise<void> {
        return persistenceMutex.dispatch(async () => {
            const currentNotes = await this.loadNotes();
            const filteredNotes = currentNotes.filter((n) => n.id !== id);
            await this.saveNotes(filteredNotes);
        });
    }
}
