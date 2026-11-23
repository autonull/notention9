import React, {useState} from 'react';
import {CheckCircleIcon, ExclamationTriangleIcon, ShieldIcon, GlobeIcon, KeyIcon} from '../ui/icons';
import {Button} from '../ui/Button';
import {Modal} from '../ui/Modal';

export interface SkillApprovalDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApprove: (autoExecute: boolean) => void;
    onReject: () => void;
    skillName: string;
    skillDescription: string;
    actions: Array<{
        type: string;
        description: string;
        url?: string;
        selector?: string;
    }>;
    domains: string[];
    requiresAuth: boolean;
    expectedOutcome?: string;
    preview?: string;
}

const PANEL = 'rounded-lg border border-[var(--app-line)] bg-[var(--app-raised)] p-3';

export function SkillApprovalDialog({
    isOpen,
    onClose,
    onApprove,
    onReject,
    skillName,
    skillDescription,
    actions,
    domains,
    requiresAuth,
    expectedOutcome,
    preview
}: SkillApprovalDialogProps) {
    const [autoExecute, setAutoExecute] = useState(false);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Approval Required"
            description={`${skillName} wants to perform actions`}
            size="xl"
            closeOnOverlayClick={false}
            footer={
                <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            checked={autoExecute}
                            onChange={e => setAutoExecute(e.target.checked)}
                            className="h-4 w-4 rounded border-[var(--app-line-strong)] bg-[var(--app-panel)] accent-[var(--app-accent)]"
                            id="auto-execute"
                        />
                        <span className="text-sm text-[var(--app-text-secondary)]">
                            Remember this choice and auto-execute in the future
                        </span>
                    </label>

                    <div className="flex justify-end gap-3 pt-1">
                        <Button variant="secondary" onClick={onReject}>
                            Reject
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAutoExecute(value => !value)}
                        >
                            {autoExecute ? '✓' : '☐'} Auto-execute
                        </Button>
                        <Button variant="primary" onClick={() => onApprove(autoExecute)}>
                            Approve &amp; Execute
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                        <ExclamationTriangleIcon className="h-5 w-5"/>
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium text-[var(--app-text)]">{skillName}</h3>
                        <p className="text-sm text-[var(--app-muted)]">{skillDescription}</p>
                    </div>
                </div>

                {preview && (
                    <div className={PANEL}>
                        <h4 className="mb-2 flex items-center gap-2 font-medium text-[var(--app-text-secondary)]">
                            <ShieldIcon className="h-4 w-4 text-[var(--app-accent-text)]"/>
                            What will happen
                        </h4>
                        <p className="whitespace-pre-wrap text-sm text-[var(--app-muted)]">{preview}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-medium text-[var(--app-text-secondary)]">
                        <GlobeIcon className="h-4 w-4 text-[var(--app-accent-text)]"/>
                        Capability Scope
                    </h4>

                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className={PANEL}>
                            <div className="mb-1 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                                <GlobeIcon className="h-3 w-3"/> External Domains
                            </div>
                            <div className="text-sm text-[var(--app-text-secondary)]">
                                {domains.length > 0 ? (
                                    <ul className="space-y-1">
                                        {domains.map(domain => (
                                            <li key={domain} className="flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]"/>
                                                {domain}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="text-[var(--app-muted)]">None (local only)</span>
                                )}
                            </div>
                        </div>

                        <div className={PANEL}>
                            <div className="mb-1 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                                <KeyIcon className="h-3 w-3"/> Authentication
                            </div>
                            <div className="text-sm">
                                {requiresAuth ? (
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <ShieldIcon className="h-3 w-3"/> Required
                                    </span>
                                ) : (
                                    <span className="text-emerald-400">Not required</span>
                                )}
                            </div>
                        </div>

                        <div className={`${PANEL} sm:col-span-2`}>
                            <div className="mb-1 flex items-center gap-2 text-xs text-[var(--app-muted)]">
                                <CheckCircleIcon className="h-3 w-3"/> Expected Outcome
                            </div>
                            <div className="text-sm text-[var(--app-text-secondary)]">
                                {expectedOutcome || 'No specific outcome described'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-medium text-[var(--app-text-secondary)]">
                        <ShieldIcon className="h-4 w-4 text-emerald-400"/>
                        Actions to Execute
                    </h4>
                    <div className="max-h-60 space-y-2 overflow-y-auto custom-scrollbar">
                        {actions.map((action, index) => (
                            <div key={index} className={`${PANEL} flex items-start gap-3`}>
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--app-accent-soft)]">
                                    <span className="font-mono text-xs text-[var(--app-accent-text)]">{index + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium capitalize text-[var(--app-text)]">{action.type}</div>
                                    <div className="truncate text-sm text-[var(--app-muted)]">{action.description}</div>
                                    {action.url && (
                                        <div className="mt-1 truncate text-xs text-[var(--app-accent-text)]">{action.url}</div>
                                    )}
                                    {action.selector && (
                                        <div className="mt-1 truncate font-mono text-xs text-[var(--app-muted)]">{action.selector}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
