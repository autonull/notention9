import React, {useState, useEffect, useMemo} from 'react';
import {actionRegistry, registerBuiltinActions, type RegisteredAction, type ActionShortcut} from '@notention/core';
import {Button} from '../ui/Button';
import {IconButton} from '../ui/Button';
import {Input} from '../ui/Input';
import {ConfirmationModal} from '../ui/Primitives';
import {useToast} from '../../hooks/useToast';
import {KeyIcon, TrashIcon, DownloadIcon, ArrowPathIcon, QuestionMarkCircleIcon, EditIcon} from '../ui/icons';

interface ShortcutEditorProps {
    action: RegisteredAction;
    onSave: (actionId: string, shortcut: ActionShortcut | null) => void;
    onCancel: () => void;
    onRemove: (actionId: string) => void;
    allShortcuts: Map<string, ActionShortcut>;
}

function formatShortcutDisplay(shortcut?: ActionShortcut): string {
    if (!shortcut) return '—';
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.meta) parts.push('⌘');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);
    return parts.join(' + ');
}

function parseShortcutInput(input: string): ActionShortcut | null {
    const parts = input.split('+').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;
    
    const shortcut: ActionShortcut = { key: '' };
    for (const part of parts) {
        const lower = part.toLowerCase();
        if (lower === 'ctrl' || lower === 'control') shortcut.ctrl = true;
        else if (lower === 'meta' || lower === 'cmd' || lower === '⌘') shortcut.meta = true;
        else if (lower === 'alt' || lower === 'option' || lower === '⌥') shortcut.alt = true;
        else if (lower === 'shift' || lower === '⇧') shortcut.shift = true;
        else shortcut.key = part;
    }
    return shortcut.key ? shortcut : null;
}

export function ShortcutsTab() {
    const {addToast} = useToast();
    const [actions, setActions] = useState<RegisteredAction[]>([]);
    const [shortcuts, setShortcuts] = useState<Map<string, ActionShortcut>>(new Map());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editInput, setEditInput] = useState('');
    const [conflicts, setConflicts] = useState<Record<string, string>>({});
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');

    // Initialize on mount
    useEffect(() => {
        registerBuiltinActions();
        refreshData();
    }, []);

    const refreshData = () => {
        const allActions = actionRegistry.getAll().filter(a => a.inPalette !== false);
        setActions(allActions);
        
        const shortcutMap = new Map<string, ActionShortcut>();
        const conflictMap: Record<string, string> = {};
        
        for (const action of allActions) {
            if (action.shortcut) {
                shortcutMap.set(action.id, action.shortcut);
                const conflict = actionRegistry.checkConflict(action.shortcut, action.id);
                if (conflict) {
                    conflictMap[action.id] = conflict;
                }
            }
        }
        setShortcuts(shortcutMap);
        setConflicts(conflictMap);
    };

    const handleStartEdit = (action: RegisteredAction) => {
        setEditingId(action.id);
        setEditInput(action.shortcut ? formatShortcutDisplay(action.shortcut) : '');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditInput('');
    };

    const handleSaveEdit = (actionId: string) => {
        const shortcut = parseShortcutInput(editInput);
        
        if (shortcut) {
            const conflict = actionRegistry.checkConflict(shortcut, actionId);
            if (conflict) {
                addToast(`Shortcut conflicts with "${conflict}"`, 'error');
                return;
            }
        }
        
        actionRegistry.unregister(actionId);
        const action = actionRegistry.get(actionId);
        if (action) {
            actionRegistry.register({
                ...action,
                shortcut: shortcut || undefined,
            });
        }
        
        addToast('Shortcut updated', 'success');
        handleCancelEdit();
        refreshData();
    };

    const handleRemoveShortcut = (actionId: string) => {
        const action = actionRegistry.get(actionId);
        if (action) {
            actionRegistry.unregister(actionId);
            actionRegistry.register({ ...action, shortcut: undefined });
            addToast('Shortcut removed', 'info');
            refreshData();
        }
    };

    const handleResetToDefaults = () => {
        actionRegistry.reset();
        registerBuiltinActions();
        addToast('Shortcuts reset to defaults', 'success');
        refreshData();
        setShowResetConfirm(false);
    };

    const handleExport = () => {
        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            shortcuts: Array.from(shortcuts.entries()).map(([id, shortcut]) => ({
                actionId: id,
                shortcut,
            })),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notention-shortcuts-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('Shortcuts exported', 'success');
    };

    const handleImport = () => {
        try {
            const data = JSON.parse(importJson);
            if (!data.shortcuts || !Array.isArray(data.shortcuts)) {
                throw new Error('Invalid format');
            }
            
            let imported = 0;
            for (const { actionId, shortcut } of data.shortcuts) {
                const action = actionRegistry.get(actionId);
                if (action && shortcut) {
                    const conflict = actionRegistry.checkConflict(shortcut, actionId);
                    if (!conflict) {
                        actionRegistry.unregister(actionId);
                        actionRegistry.register({ ...action, shortcut });
                        imported++;
                    }
                }
            }
            
            addToast(`Imported ${imported} shortcuts`, 'success');
            setShowImportModal(false);
            setImportJson('');
            refreshData();
        } catch (e) {
            addToast('Invalid JSON format', 'error');
        }
    };

    const groupedActions = useMemo(() => {
        const groups: Record<string, RegisteredAction[]> = {};
        for (const action of actions) {
            const cat = action.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(action);
        }
        return groups;
    }, [actions]);

    const categoryOrder = ['Navigation', 'Capture', 'Note', 'Search', 'Match', 'Palette', 'Help', 'Other'];

    return (
        <div className="bg-[var(--app-surface)] p-4 md:p-6 rounded-lg animate-fade-in lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
            <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg text-purple-400">
                            <KeyIcon className="h-6 w-6" />
                        </div>
                        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--app-text)]">Keyboard Shortcuts</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleExport} icon={DownloadIcon}>
                            Export
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowImportModal(true)} icon={ArrowPathIcon}>
                            Import
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(true)} icon={ArrowPathIcon} className="text-amber-400 hover:text-amber-300">
                            Reset to Defaults
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-[var(--app-muted)]">
                    Customize keyboard shortcuts for actions. Press keys to set a shortcut (e.g., Ctrl+K, ⌘+Shift+P).
                    Conflicts are detected automatically. Mac users: ⌘ = Command, ⌥ = Option, ⇧ = Shift.
                </p>
            </div>

            <div className="mt-4 lg:overflow-y-auto custom-scrollbar lg:flex-1 lg:min-h-0">
                {categoryOrder.map(category => {
                    const catActions = groupedActions[category];
                    if (!catActions || catActions.length === 0) return null;
                    
                    return (
                        <div key={category} className="mb-6">
 <h3 className="text-xs font-bold text-[var(--app-muted)] tracking-widest mb-4 px-2">
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {catActions.map(action => {
                                    const isEditing = editingId === action.id;
                                    const shortcut = action.shortcut;
                                    const conflict = conflicts[action.id];
                                    
                                    return (
                                        <div 
                                            key={action.id} 
                                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                                conflict ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--app-line)]/30 bg-[var(--app-surface)]/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className="font-medium text-[var(--app-text)] truncate">{action.label}</span>
                                                {action.description && (
                                                    <span className="text-xs text-[var(--app-muted)] whitespace-nowrap">{action.description}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Input
                                                            value={editInput}
                                                            onChange={(e) => setEditInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveEdit(action.id);
                                                                else if (e.key === 'Escape') handleCancelEdit();
                                                            }}
                                                            placeholder="Press keys..."
                                                            autoFocus
                                                            className="w-48 bg-[var(--app-raised)] border border-blue-500/50 rounded px-2 py-1 text-[var(--app-text)] text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                                                        />
                                                        <Button variant="ghost" size="sm" onClick={() => handleSaveEdit(action.id)} className="text-green-400">
                                                            ✓
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="text-[var(--app-muted)]">
                                                            ✕
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {shortcut ? (
                                                            <>
                                                                <kbd className="px-2 py-1 text-xs font-mono bg-[var(--app-raised)] border border-[var(--app-line-strong)] rounded text-[var(--app-text-secondary)] min-w-[120px] text-center">
                                                                    {formatShortcutDisplay(shortcut)}
                                                                </kbd>
                                                                <IconButton
                                                                    onClick={() => handleStartEdit(action)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-[var(--app-muted)] hover:text-blue-400"
                                                                    aria-label={`Edit shortcut for ${action.label}`}
                                                                    icon={EditIcon}
                                                                />
                                                                <IconButton
                                                                    onClick={() => handleRemoveShortcut(action.id)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-[var(--app-muted)] hover:text-red-400"
                                                                    aria-label={`Remove shortcut for ${action.label}`}
                                                                    icon={TrashIcon}
                                                                />
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleStartEdit(action)}
                                                                className="text-[var(--app-muted)] hover:text-blue-400 px-3 py-1"
                                                            >
                                                                + Add Shortcut
                                                            </Button>
                                                        )}
                                                        {conflict && (
                                                            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded" title={`Conflicts with ${conflict}`}>
                                                                <QuestionMarkCircleIcon className="w-3 h-3" />
                                                                Conflict
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={handleResetToDefaults}
                title="Reset All Shortcuts?"
                message="This will restore all keyboard shortcuts to their default values. Your custom shortcuts will be lost."
                confirmLabel="Reset to Defaults"
                isDestructive
            />

            <ConfirmationModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onConfirm={handleImport}
                title="Import Shortcuts"
                message="Paste exported shortcuts JSON below:"
                confirmLabel="Import"
            >
                <textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    className="w-full h-32 bg-[var(--app-raised)] border border-[var(--app-line-strong)] rounded px-3 py-2 text-[var(--app-text)] text-sm font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    placeholder='{"version":1,"shortcuts":[{"actionId":"nav.goToInbox","shortcut":{"key":"1","ctrl":true}}]}'
                />
            </ConfirmationModal>
        </div>
    );
}