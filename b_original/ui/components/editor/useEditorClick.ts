import React, { useCallback } from 'react';
import { Editor } from '@tiptap/react';

interface InitialModalData {
  key: string;
  operator: string;
  value: string;
  icon?: string;
}

interface UseEditorClickProps {
  editor: Editor | null;
  setEditingPropertyPos: (pos: number) => void;
  setInitialModalData: (data: InitialModalData | undefined) => void;
  setIsPropertyModalOpen: (open: boolean) => void;
  setSearchTerm: (term: string) => void;
  setActiveView: (view: string) => void;
  addToast: (msg: string, type: 'info' | 'error' | 'success') => void;
  setSelectedNoteId: (id: string) => void;
}

export const useEditorClick = ({
  editor,
  setEditingPropertyPos,
  setInitialModalData,
  setIsPropertyModalOpen,
  setSearchTerm,
  setActiveView,
  addToast,
  setSelectedNoteId
}: UseEditorClickProps) => {

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked inside a property node
      const propertyNode = target.closest('.node-property');
      if (propertyNode && editor) {
          e.preventDefault();
          e.stopPropagation();

          // Try finding the node by searching from the click pos.
          const coords = { left: e.clientX, top: e.clientY };
          const posInfo = editor.view.posAtCoords(coords);
          if (posInfo) {
              const { pos } = posInfo;

              // Check specific node at pos
              const nodeAt = editor.state.doc.nodeAt(pos);
              if (nodeAt && nodeAt.type.name === 'property') {
                  setEditingPropertyPos(pos);
                  setInitialModalData({
                      key: nodeAt.attrs.name,
                      operator: nodeAt.attrs.operator,
                      value: nodeAt.attrs.value,
                      icon: nodeAt.attrs.icon
                  });
                  setIsPropertyModalOpen(true);
                  return;
              }
              // Check before (if we clicked right side)
              const nodeBefore = editor.state.doc.nodeAt(pos - 1);
              if (nodeBefore && nodeBefore.type.name === 'property') {
                   setEditingPropertyPos(pos - 1);
                   setInitialModalData({
                      key: nodeBefore.attrs.name,
                      operator: nodeBefore.attrs.operator,
                      value: nodeBefore.attrs.value,
                      icon: nodeBefore.attrs.icon
                   });
                   setIsPropertyModalOpen(true);
                   return;
              }
          }
      }

      // Handle both tags and properties (which are also searchable)
      if (target.classList.contains('suggestion-tag') || target.classList.contains('suggestion-item')) {
          e.preventDefault();
          const text = target.innerText;

          // For tags, ensure '#' prefix. For properties, use as is.
          const searchTerm = target.classList.contains('suggestion-tag') && !text.startsWith('#')
            ? `#${text}`
            : text;

          setSearchTerm(searchTerm);
          setActiveView('notes');
          addToast(`Filtered by ${searchTerm}`, 'info');
      }

      // Handle Note Links
      if (target.classList.contains('suggestion-note')) {
          e.preventDefault();
          const noteId = target.getAttribute('data-id');
          if (noteId) {
              setSelectedNoteId(noteId);
              setActiveView('notes');
          }
      }
  }, [editor, setEditingPropertyPos, setInitialModalData, setIsPropertyModalOpen, setSearchTerm, setActiveView, addToast, setSelectedNoteId]);

  return handleEditorClick;
};
