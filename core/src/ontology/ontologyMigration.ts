import type { Note, Property } from '../types/index.js';
import type { OntologyChange, OntologyVersion } from './OntologyAdapter.js';

export interface MigrationResult {
    migratedNotes: Note[];
    changesApplied: AppliedChange[];
    errors: MigrationError[];
}

export interface AppliedChange {
    change: OntologyChange;
    affectedNoteIds: string[];
    details: string;
}

export interface MigrationError {
    change: OntologyChange;
    noteId: string;
    error: string;
}

/**
 * Applies a single ontology change to a note's properties.
 * Returns the modified properties array and whether any changes were made.
 */
function applyChangeToProperties(
    properties: Property[],
    change: OntologyChange
): { properties: Property[]; changed: boolean; details: string } {
    const pathParts = change.path.split('.');
    const [first, ...rest] = pathParts;

    switch (change.type) {
        case 'add': {
            // Add a new property if it doesn't exist
            const key = rest[0] || first;
            const exists = properties.some(p => p.key === key);
            if (exists) {
                return { properties, changed: false, details: `Property ${key} already exists` };
            }
            const afterValue = change.after as unknown as string | string[];
            const newProp: Property = {
                key,
                operator: 'is',
                values: Array.isArray(afterValue) ? afterValue : [afterValue],
                role: 'fact',
                provenance: 'inferred',
            };
            return {
                properties: [...properties, newProp],
                changed: true,
                details: `Added property ${key} with value ${String(change.after)}`,
            };
        }

        case 'modify': {
            // Modify existing property (key, operator, values, type, etc.)
            const key = rest[0] || first;
            const propIndex = properties.findIndex(p => p.key === key);
            if (propIndex === -1) {
                return { properties, changed: false, details: `Property ${key} not found` };
            }

            const prop = { ...properties[propIndex] };
            let changed = false;
            const details: string[] = [];

            // Handle different modification targets
            if (rest[1] === 'key' && change.after !== change.before) {
                // Rename property key
                prop.key = String(change.after);
                changed = true;
                details.push(`Renamed property from ${String(change.before)} to ${String(change.after)}`);
            } else if (rest[1] === 'operator' && change.after !== change.before) {
                prop.operator = String(change.after);
                changed = true;
                details.push(`Changed operator from ${String(change.before)} to ${String(change.after)}`);
            } else if (rest[1] === 'values' && JSON.stringify(change.after) !== JSON.stringify(change.before)) {
                prop.values = Array.isArray(change.after) ? change.after : [change.after];
                changed = true;
                details.push(`Changed values from ${JSON.stringify(change.before)} to ${JSON.stringify(change.after)}`);
            } else if (rest[1] === 'role' && change.after !== change.before) {
                prop.role = String(change.after) as Property['role'];
                changed = true;
                details.push(`Changed role from ${String(change.before)} to ${String(change.after)}`);
            } else if (rest.length === 1) {
                // Generic modify - replace entire property if after is a Property-like object
                if (change.after && typeof change.after === 'object' && 'key' in change.after) {
                    const newProp = { ...prop, ...(change.after as Partial<Property>) };
                    if (JSON.stringify(newProp) !== JSON.stringify(prop)) {
                        Object.assign(prop, newProp);
                        changed = true;
                        details.push('Modified property');
                    }
                }
            }

            if (!changed) {
                return { properties, changed: false, details: 'No modification needed' };
            }

            const newProperties = [...properties];
            newProperties[propIndex] = prop;
            return { properties: newProperties, changed: true, details: details.join('; ') };
        }

        case 'remove': {
            // Remove a property
            const key = rest[0] || first;
            const propIndex = properties.findIndex(p => p.key === key);
            if (propIndex === -1) {
                return { properties, changed: false, details: `Property ${key} not found` };
            }

            const newProperties = properties.filter(p => p.key !== key);
            return {
                properties: newProperties,
                changed: true,
                details: `Removed property ${key}`,
            };
        }

        case 'deprecate': {
            // Mark property as deprecated by changing role to 'marker' (valid PropertyRole)
            const key = rest[0] || first;
            const propIndex = properties.findIndex(p => p.key === key);
            if (propIndex === -1) {
                return { properties, changed: false, details: `Property ${key} not found` };
            }

            const prop = { ...properties[propIndex] };
            if (prop.role === 'marker') {
                return { properties, changed: false, details: `Property ${key} already deprecated` };
            }

            prop.role = 'marker';
            const newProperties = [...properties];
            newProperties[propIndex] = prop;
            return {
                properties: newProperties,
                changed: true,
                details: `Deprecated property ${key}`,
            };
        }

        default:
            return { properties, changed: false, details: `Unknown change type: ${(change as OntologyChange).type}` };
    }
}

/**
 * Checks if a note has already been migrated for a specific change.
 * Uses a migration marker in note metadata to ensure idempotency.
 */
function isNoteMigrated(note: Note, change: OntologyChange): boolean {
    const migrationKey = `_migration_${change.path}_${change.version}`;
    return note.properties.some(p => p.key === migrationKey && p.values.includes('applied'));
}

/**
 * Marks a note as migrated for a specific change.
 */
function markNoteMigrated(note: Note, change: OntologyChange): Note {
    const migrationKey = `_migration_${change.path}_${change.version}`;
    const existingIndex = note.properties.findIndex(p => p.key === migrationKey);

    const migrationProp: Property = {
        key: migrationKey,
        operator: 'is',
        values: ['applied', change.timestamp.toISOString()],
        role: 'marker',
        provenance: 'inferred',
    };

    const newProperties = existingIndex >= 0
        ? note.properties.map((p, i) => i === existingIndex ? migrationProp : p)
        : [...note.properties, migrationProp];

    return { ...note, properties: newProperties, updatedAt: new Date().toISOString() };
}

/**
 * Migrates a single note through a list of ontology changes.
 * Idempotent: notes already migrated for a change are skipped.
 */
export function migrateNote(note: Note, changes: OntologyChange[]): { note: Note; appliedChanges: AppliedChange[]; errors: MigrationError[] } {
    let currentNote = note;
    const appliedChanges: AppliedChange[] = [];
    const errors: MigrationError[] = [];

    for (const change of changes) {
        // Skip if already migrated (idempotency)
        if (isNoteMigrated(currentNote, change)) {
            continue;
        }

        try {
            const { properties, changed, details } = applyChangeToProperties(currentNote.properties, change);

            // Apply property changes first
            if (changed) {
                currentNote = { ...currentNote, properties, updatedAt: new Date().toISOString() };
                appliedChanges.push({
                    change,
                    affectedNoteIds: [currentNote.id],
                    details,
                });
            }

            // Then mark as migrated for idempotency (whether changed or no-op due to missing property)
            const wasNoOp = !changed && details.includes('not found');
            if (changed || wasNoOp) {
                currentNote = markNoteMigrated(currentNote, change);
            }
        } catch (error) {
            errors.push({
                change,
                noteId: currentNote.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return { note: currentNote, appliedChanges, errors };
}

/**
 * Migrates all notes through an ontology version's changes.
 * Idempotent: can be run multiple times safely.
 */
export function migrateNotes(
    notes: Note[],
    version: OntologyVersion
): MigrationResult {
    const allAppliedChanges: AppliedChange[] = [];
    const allErrors: MigrationError[] = [];

    // First pass: migrate each note
    const migratedNotes = notes.map(note => {
        const { note: migratedNote, appliedChanges, errors } = migrateNote(note, version.changes);
        allAppliedChanges.push(...appliedChanges);
        allErrors.push(...errors);
        return migratedNote;
    });

    // Second pass: collect all affected note IDs per change
    const changeToNoteIds = new Map<string, Set<string>>();
    for (const ac of allAppliedChanges) {
        const key = `${ac.change.path}_${ac.change.version}`;
        if (!changeToNoteIds.has(key)) {
            changeToNoteIds.set(key, new Set());
        }
        for (const id of ac.affectedNoteIds) {
            changeToNoteIds.get(key)!.add(id);
        }
    }

    // Build deduplicated applied changes with all affected note IDs
    const uniqueAppliedChanges: AppliedChange[] = [];
    for (const [key, noteIds] of changeToNoteIds.entries()) {
        const firstAc = allAppliedChanges.find(ac => `${ac.change.path}_${ac.change.version}` === key);
        if (firstAc) {
            uniqueAppliedChanges.push({
                ...firstAc,
                affectedNoteIds: Array.from(noteIds),
            });
        }
    }

    return {
        migratedNotes,
        changesApplied: uniqueAppliedChanges,
        errors: allErrors,
    };
}

/**
 * Creates an ontology version from a changelog.
 * Useful for building migration versions programmatically.
 */
export function createOntologyVersion(
    version: string,
    changes: OntologyChange[],
    baseVersion?: string
): OntologyVersion {
    return {
        version,
        baseVersion,
        changes: changes.map(c => ({
            ...c,
            version,
            timestamp: c.timestamp ?? new Date(),
        })),
    };
}

/**
 * Validates that a migration can be applied without conflicts.
 * Returns warnings for potential issues.
 */
export function validateMigration(
    notes: Note[],
    version: OntologyVersion
): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    for (const change of version.changes) {
        const pathParts = change.path.split('.');
        const key = pathParts[1] || pathParts[0];

        switch (change.type) {
            case 'add': {
                // Check if property already exists in some notes
                const existingCount = notes.filter(n => n.properties.some(p => p.key === key)).length;
                if (existingCount > 0) {
                    warnings.push(`Add change for '${key}': ${existingCount} notes already have this property`);
                }
                break;
            }
            case 'modify': {
                if (change.path.includes('.key')) {
                    // Renaming - check if new key already exists
                    const newKey = String(change.after);
                    const conflictCount = notes.filter(n => n.properties.some(p => p.key === newKey)).length;
                    if (conflictCount > 0) {
                        warnings.push(`Rename to '${newKey}': ${conflictCount} notes already have target key`);
                    }
                }
                break;
            }
            case 'remove': {
                // Check if any notes actually have this property
                const existingCount = notes.filter(n => n.properties.some(p => p.key === key)).length;
                if (existingCount === 0) {
                    warnings.push(`Remove '${key}': no notes have this property`);
                }
                break;
            }
            case 'deprecate': {
                const existingCount = notes.filter(n => n.properties.some(p => p.key === key)).length;
                if (existingCount === 0) {
                    warnings.push(`Deprecate '${key}': no notes have this property`);
                }
                break;
            }
        }
    }

    return { valid: warnings.length === 0, warnings };
}

/**
 * Removes migration markers from notes (cleanup after successful migration).
 * Use with caution - removes idempotency guarantees.
 */
export function clearMigrationMarkers(notes: Note[], version: string): Note[] {
    return notes.map(note => {
        const migrationProps = note.properties.filter(p =>
            p.key.startsWith('_migration_') && p.key.endsWith(`_${version}`)
        );
        if (migrationProps.length === 0) return note;

        return {
            ...note,
            properties: note.properties.filter(p =>
                !p.key.startsWith('_migration_') || !p.key.endsWith(`_${version}`)
            ),
            updatedAt: new Date().toISOString(),
        };
    });
}