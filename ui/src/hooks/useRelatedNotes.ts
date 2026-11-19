import { useMemo, useEffect, useState } from 'react';
import { OntologyService } from '@notention/core';
import { useSettings } from './useSettingsContext';
import { useNotes } from './useNotes';
import type { RelatedNotesService, RelatedNotesOptions, RelatedNote } from '@notention/core';

export function useRelatedNotes(currentNote: any | null, options: RelatedNotesOptions = {}) {
    const { settings } = useSettings();
    const ontology = settings.ontology || [];
    const { notes } = useNotes();
    const [service, setService] = useState<RelatedNotesService | null>(null);

    // Create or update the OntologyService and RelatedNotesService when notes or ontology change
    useEffect(() => {
        const ontologyService = new OntologyService(ontology);

        // Feed all notes to build co-occurrence data
        ontologyService.recordUsage(
            notes.flatMap(n => n.properties.map(p => ({
                key: p.key,
                values: p.values
            })))
        );

        const coOccurrenceRecorder = ontologyService.getCoOccurrenceRecorder();

        // Dynamic import to avoid circular dependency
        import('@notention/core').then(({ RelatedNotesService, createRelatedNotesService }) => {
            const newService = createRelatedNotesService(
                notes,
                coOccurrenceRecorder,
                ontology,
                options
            );
            setService(newService);
        });
    }, [notes, ontology, options]);

    // Update service when current note changes (for reactivity)
    useEffect(() => {
        if (service && currentNote) {
            service.updateNotes(notes);
        }
    }, [service, currentNote, notes]);

    const findRelated = useMemo(
        () => currentNote && service ? service.findRelated(currentNote) : [],
        [currentNote, service]
    );

    const findBacklinks = useMemo(
        () => currentNote && service ? service.findBacklinks(currentNote) : [],
        [currentNote, service]
    );

    return {
        findRelated,
        findBacklinks,
        service,
    };
}