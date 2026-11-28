/**
 * Base UI Components
 * 
 * Foundation components that eliminate boilerplate across 50+ components:
 * - BaseModal: Portal, focus trap, escape handling, body scroll lock
 * - BasePanel: Resizable, collapsible panes with persistence
 * - BaseList: Virtualized, selectable lists with keyboard navigation
 * - BaseEditor: Dirty tracking, autosave, undo/redo, validation
 */

export {
    BaseModal,
    ConfirmationModal,
    ModalFooter,
    type BaseModalProps,
    type ModalSize,
    type ModalPlacement,
    type ConfirmationModalProps,
} from './BaseModal';

export {
    BasePanel,
    CollapsiblePanel,
    type BasePanelProps,
    type CollapsiblePanelProps,
    type PaneConfig,
    type PanelOrientation,
} from './BasePanel';

export {
    BaseList,
    ColumnList,
    type BaseListProps,
    type ColumnListProps,
    type Column,
    type ListItem,
} from './BaseList';

export {
    BaseEditor,
    EditorToolbar,
    EditorStatus,
    type BaseEditorProps,
    type EditorState,
    type EditorActions,
    type EditorToolbarProps,
    type EditorStatusProps,
} from './BaseEditor';