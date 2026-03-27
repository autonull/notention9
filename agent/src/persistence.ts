import fs from 'fs';
import { join } from 'path';
import { Note, Mutex, Logger } from '@notention/core';

const DATA_DIR = join(process.cwd(), 'data');
const NOTES_FILE = join(DATA_DIR, 'notes.json');
const persistenceMutex = new Mutex();
const logger = Logger.getInstance();

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
            try {
                return JSON.parse(data);
            } catch (parseError) {
                logger.error('CRITICAL: Failed to parse notes.json', parseError instanceof Error ? parseError : new Error(String(parseError)));
                const corruptFile = `${NOTES_FILE}.corrupt.${Date.now()}`;
                try {
                    await fs.promises.rename(NOTES_FILE, corruptFile);
                    logger.warn(`Renamed corrupt notes.json to ${corruptFile}`);
                } catch (renameError) {
                    logger.error('Failed to rename corrupt file', renameError instanceof Error ? renameError : new Error(String(renameError)));
                    throw renameError;
                }
                return [];
            }
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                return [];
            }
            throw e;
        }
    }

    static async saveNotes(notes: Note[]): Promise<void> {
        await this.ensureDataDir();
        const tempFile = `${NOTES_FILE}.tmp`;
        try {
            await fs.promises.writeFile(tempFile, JSON.stringify(notes, null, 2));
            await fs.promises.rename(tempFile, NOTES_FILE);
        } catch (error) {
            logger.error('Failed to save notes atomically', error instanceof Error ? error : new Error(String(error)));
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

    static async getNoteSafe(id: string): Promise<Note | undefined> {
        return persistenceMutex.dispatch(async () => {
            const notes = await this.loadNotes();
            return notes.find(n => n.id === id);
        });
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

    static async searchNotesSafe(query: string, tags?: string[]): Promise<Note[]> {
        return persistenceMutex.dispatch(async () => {
            const allNotes = await this.loadNotes();
            return allNotes.filter(note => {
                const matchesQuery = !query ||
                    note.title.toLowerCase().includes(query.toLowerCase()) ||
                    note.content.toLowerCase().includes(query.toLowerCase());

                const matchesTags = !tags || tags.length === 0 ||
                    tags.every(tag => note.tags.includes(tag));

                return matchesQuery && matchesTags;
            });
        });
    }
}
