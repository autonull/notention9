import React, {useMemo, useState} from 'react';
import {ShieldIcon, TrashIcon, InformationCircleIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {ConfirmationModal} from '../ui/Primitives';
import {useNotes} from '../../hooks/useNotes';
import {CapabilityManager, type Permission} from '@notention/core';
import {Badge} from '../ui/Badge';
import {SectionHeader} from '../ui/kit';

const capabilityManager = new CapabilityManager();

interface CapabilityGrant {
    noteId: string;
    noteTitle: string;
    permission: Permission;
}

interface CapabilitiesPanelProps {
    onGrantViewed?: (noteId: string, capability: string) => void;
    onRevoked?: (noteId: string, capability: string) => void;
}

export function CapabilitiesPanel({onGrantViewed, onRevoked}: CapabilitiesPanelProps) {
    const {notes, updateNote} = useNotes();
    const [revokeConfirm, setRevokeConfirm] = useState<CapabilityGrant | null>(null);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const grants = useMemo((): CapabilityGrant[] => {
        const result: CapabilityGrant[] = [];
        for (const note of notes) {
            const permissions = capabilityManager.extractPermissions(note.properties);
            for (const perm of permissions) {
                result.push({
                    noteId: note.id,
                    noteTitle: note.title || 'Untitled',
                    permission: {...perm, sourceNoteId: note.id}
                });
            }
        }
        return result;
    }, [notes]);

    const groupedByNote = useMemo(() => {
        const groups: Record<string, CapabilityGrant[]> = {};
        for (const grant of grants) {
            (groups[grant.noteId] ??= []).push(grant);
        }
        return groups;
    }, [grants]);

    const handleRevoke = async (grant: CapabilityGrant) => {
        const note = notes.find(n => n.id === grant.noteId);
        if (!note) return;

        const newProperties = note.properties.filter(prop => {
            if (prop.key !== 'permission' || prop.operator !== 'grant') return true;
            if (prop.values.length < 2) return true;
            return !(prop.values[0] === grant.permission.type && prop.values[1] === grant.permission.scope);
        });

        await updateNote({...note, properties: newProperties});
    };

    const formatCapability = (type: string) => {
        const [domain, action] = type.split(':');
        return `${domain}:${action}`;
    };

    if (grants.length === 0) {
        return (
            <div className="space-y-8">
                <div className="flex items-start gap-2 text-[var(--app-muted)]">
                    <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0"/>
                    <div>
                        <h3 className="text-[13px] font-medium text-[var(--app-text-secondary)]">No capability grants</h3>
                        <p className="mt-0.5 text-[12px]">Add <code className="font-mono text-[var(--app-accent-text)]">[@allow:browser:navigate:example.com]</code> to a note to grant capabilities.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <SectionHeader
                title="Capability grants"
                description="Permissions granted by notes. Revoke to remove access immediately."
                icon={ShieldIcon}
            />

            <div className="space-y-4">
                {Object.entries(groupedByNote).map(([noteId, noteGrants]) => (
                    <div key={noteId} className="border border-[var(--app-line)]/50 rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                const isExpanding = expandedNoteId !== noteId;
                                setExpandedNoteId(isExpanding ? noteId : null);
                                if (isExpanding) {
                                    noteGrants.forEach(grant => {
                                        onGrantViewed?.(noteId, `${grant.permission.type}:${grant.permission.scope}`);
                                    });
                                }
                            }}
                            className="w-full p-4 flex items-center justify-between hover:bg-[var(--app-raised)] transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <InformationCircleIcon className="h-5 w-5 text-[var(--app-muted)]"/>
                                <span className="font-medium text-[var(--app-text)] truncate">{noteGrants[0].noteTitle}</span>
                                <Badge variant="secondary" className="text-xs">{noteGrants.length} grant{noteGrants.length > 1 ? 's' : ''}</Badge>
                            </div>
                            <InformationCircleIcon
                                className={`h-5 w-5 text-[var(--app-muted)] transition-transform ${expandedNoteId === noteId ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {expandedNoteId === noteId && (
                            <div className="border-t border-[var(--app-line)]/50 p-4 space-y-3 bg-[var(--app-surface)]/50">
                                {noteGrants.map((grant, idx) => (
                                    <div key={`${noteId}-${idx}`} className="flex items-center justify-between gap-4 p-3 bg-[var(--app-raised)] rounded-lg">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <ShieldIcon tone="success" className="h-5 w-5 flex-shrink-0"/>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <code className="text-blue-300 font-mono text-xs bg-[var(--app-surface)] px-1.5 py-0.5 rounded">{formatCapability(grant.permission.type)}</code>
                                                    <span className="text-[var(--app-muted)]">→</span>
                                                    <code className="text-purple-300 font-mono text-xs bg-[var(--app-surface)] px-1.5 py-0.5 rounded">{grant.permission.scope}</code>
                                                </div>
                                                <div className="text-xs text-[var(--app-muted)] mt-1">
                                                    Granted: {new Date(grant.permission.grantedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            icon={TrashIcon}
                                            onClick={() => setRevokeConfirm(grant)}
                                            aria-label={`Revoke ${formatCapability(grant.permission.type)} for ${grant.permission.scope}`}
                                        >
                                            Revoke
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmationModal
                isOpen={!!revokeConfirm}
                onClose={() => setRevokeConfirm(null)}
                onConfirm={() => {
                    if (revokeConfirm) {
                        handleRevoke(revokeConfirm);
                        onRevoked?.(revokeConfirm.noteId, `${revokeConfirm.permission.type}:${revokeConfirm.permission.scope}`);
                    }
                    setRevokeConfirm(null);
                }}
                title="Revoke Capability Grant?"
                message={`Remove the grant for <code className="text-blue-300">{revokeConfirm ? formatCapability(revokeConfirm.permission.type) : ''}</code> → <code className="text-purple-300">{revokeConfirm?.permission.scope || ''}</code> from note "<strong>{revokeConfirm?.noteTitle}</strong>"? This takes effect immediately.`}
                confirmLabel="Revoke"
                isDestructive
            />
        </div>
    );
}