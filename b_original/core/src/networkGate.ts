import type { Note } from './types/index.js';

/**
 * Privacy error thrown when attempting to transmit private notes without user consent
 */
export class PrivacyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PrivacyError';
    }
}

/**
 * NetworkGate enforces privacy-by-default for note transmission.
 * Prevents accidental leaking of private notes to external networks.
 */
export class NetworkGate {
    /**
     * Check if note can be transmitted over network
     * @param note - Note to check
     * @param destination - Destination description (e.g., 'Nostr network', 'API endpoint')
     * @param promptUser - Optional callback to prompt user for confirmation
     * @returns Promise<boolean> - true if transmission allowed, false otherwise
     * @throws {PrivacyError} if note is private and no promptUser callback provided
     */
    async canTransmit(
        note: Note,
        destination: string,
        promptUser?: (message: string) => Promise<boolean>
    ): Promise<boolean> {
        // Public notes can always be transmitted
        if (note.public) {
            return true;
        }

        // Private note without user prompt callback - deny
        if (!promptUser) {
            throw new PrivacyError(
                `Cannot transmit private note ${note.id} to ${destination}. Note is marked as private.`
            );
        }

        // Ask user for confirmation
        const message = `"${note.title}" is currently private. Make it public to share with ${destination}?`;
        const confirmed = await promptUser(message);

        if (!confirmed) {
            return false;
        }

        // User confirmed - mark as public
        // Note: This mutates the note. Caller should persist this change.
        note.public = true;
        return true;
    }

    /**
     * Batch check for multiple notes
     * @param notes - Notes to check
     * @param destination - Destination description
     * @param promptUser - Optional callback to prompt user for confirmation
     * @returns Promise<Note[]> - Array of notes that can be transmitted
     */
    async filterTransmittable(
        notes: Note[],
        destination: string,
        promptUser?: (message: string) => Promise<boolean>
    ): Promise<Note[]> {
        const transmittable: Note[] = [];

        for (const note of notes) {
            try {
                const canTransmit = await this.canTransmit(note, destination, promptUser);
                if (canTransmit) {
                    transmittable.push(note);
                }
            } catch (error) {
                if (error instanceof PrivacyError) {
                    console.warn(`Blocked private note: ${note.id}`);
                    continue;
                }
                throw error;
            }
        }

        return transmittable;
    }
}
