import { useCallback, useMemo } from 'react';
import type { Note, Property } from '@notention/core';
import { parseProperties, replacePropertyInString, PropertyExtractor, getTextFromHtml } from '@notention/core';
import { useDebouncedSave } from './useDebouncedSave';
import { useView } from './useViewContext';
import { useToast } from './useToast';
import { useSettings } from './useSettingsContext';
import { useGardener } from './useGardener';
import { useOntologyMatching } from './useOntologyMatching';
import { useEditorMagic } from './useEditorMagic';
import { useEditorPublishing } from './useEditorPublishing';
import { useEditorTemplates } from './useEditorTemplates';

interface UseEditorLogicProps {
  note: Note;
  onSave: (note: Note) => void;
}

export const useEditorLogic = ({ note, onSave }: UseEditorLogicProps) => {
  const { setActiveView, setMatchingNoteId } = useView();
  const { addToast } = useToast();
  const { settings } = useSettings();
  const { evolveOntology } = useGardener();

  const handlePersist = useCallback((n: Note) => {
    onSave(n);
    if (settings.developerMode) {
      evolveOntology([n]).then(attrs => {
        if (attrs.length > 0) {
          const keys = attrs.map(a => a.key).join(', ');
          addToast(`Ontology evolved! You introduced: ${keys}`, 'info');
        }
      });
    }
  }, [onSave, settings.developerMode, evolveOntology, addToast]);

  const { dirtyNote, setDirtyNote, saveStatus } = useDebouncedSave(note, handlePersist);

  // Memoize property extractor
  const propertyExtractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);

  // Expose immediate save for Ctrl+S
  const saveImmediately = useCallback(() => {
      handlePersist(dirtyNote);
  }, [handlePersist, dirtyNote]);

  const {
      matchingOntologyNode,
      actionLabel,
      validationErrors,
      missingProperties
  } = useOntologyMatching({
      tags: dirtyNote.tags,
      properties: dirtyNote.properties,
      ontology: settings.ontology
  });

  const {
    handlePublish,
    isPublishing,
    privacyConfirmation,
    handlePrivacyConfirm,
    handlePrivacyCancel
  } = useEditorPublishing({
    dirtyNote,
    setDirtyNote,
    onSave,
    validationErrors,
    actionLabel
  });

  const { handleSaveTemplate } = useEditorTemplates({ dirtyNote });

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDirtyNote((prev) => ({ ...prev, title: e.target.value })),
    [setDirtyNote]
  );

  const handleTagsChange = useCallback(
    (newTags: string[]) => {
      setDirtyNote((prev) => ({ ...prev, tags: newTags }));
    },
    [setDirtyNote]
  );

  const handleContentSave = useCallback(
    (content: string) => {
      // 1. Parse explicit properties from content (bracket syntax)
      const explicitProperties = parseProperties(content);

      // 2. Extract implicit properties from plain text
      const plainText = getTextFromHtml(content);
      const implicitProperties = propertyExtractor.extractFromText(plainText);

      // 3. Merge properties: Explicit overrides Implicit
      // We only add implicit properties if their key is NOT present in explicit ones
      const explicitKeys = new Set(explicitProperties.map(p => p.key));
      const newImplicitProps = implicitProperties.filter(p => !explicitKeys.has(p.key));

      const properties = [...explicitProperties, ...newImplicitProps];

      setDirtyNote((prev) => {
          const updated = { ...prev, content, properties };
          return updated;
      });
    },
    [setDirtyNote, propertyExtractor]
  );

  const { handleMagic, handleAutoTag, isAutoTagging, isApiKeyAvailable } = useEditorMagic({
      noteId: dirtyNote.id,
      content: dirtyNote.content,
      tags: dirtyNote.tags,
      onTagsChange: handleTagsChange,
      onContentSave: handleContentSave,
      ontology: settings.ontology
  });

  const handleFindMatches = () => {
      setMatchingNoteId(dirtyNote.id);
      setActiveView('network');
  };

  const handleUpdateTextFromInspector = useCallback((oldProp: Property | null, newProp: Property | null) => {
      const newContent = replacePropertyInString(dirtyNote.content, oldProp, newProp);

      if (newContent !== dirtyNote.content) {
          handleContentSave(newContent);
      }
  }, [dirtyNote.content, handleContentSave]);

  const handleUpdateProperty = useCallback((key: string, value: string) => {
    // Find existing property with this key
    const existingProp = dirtyNote.properties.find(p => p.key === key);

    const newProp = {
        key,
        operator: 'is',
        values: [value]
    };

    const newContent = replacePropertyInString(dirtyNote.content, existingProp || null, newProp);

    if (newContent !== dirtyNote.content) {
        handleContentSave(newContent);
    }
  }, [dirtyNote, handleContentSave]);

  const handleUpdateLocation = useCallback((latlng: string) => {
      handleUpdateProperty('location', latlng);
  }, [handleUpdateProperty]);

  return {
    dirtyNote,
    isPublishing,
    handleTitleChange,
    handleTagsChange,
    handlePublish,
    handleFindMatches,
    handleContentSave,
    handleUpdateTextFromInspector,
    handleUpdateLocation,
    handleUpdateProperty,
    handleAutoTag,
    handleMagic,
    handleSaveTemplate,
    saveImmediately,
    isAutoTagging,
    isApiKeyAvailable,
    settings, // needed for ontology
    isPublished: !!dirtyNote.nostrEventId,
    actionLabel,
    validationErrors,
    missingProperties,
    matchingOntologyNode,
    saveStatus,
    privacyConfirmation,
    handlePrivacyConfirm,
    handlePrivacyCancel
  };
};
