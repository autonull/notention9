import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettingsContext';
import { useToast } from '../../hooks/useToast';
import { SkillExecutor, SkillExecutionRecord } from '@notention/core';
import { SkillApprovalDialog } from './SkillApprovalDialog';
import { Button } from '../ui/Button';
import { Chip, SectionHeader } from '../ui/kit';
import { Toggle } from '../ui/Primitives';
import { PlayIcon, ShieldIcon, XCircleIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../ui/icons';
import { IndeedSkill, GitHubSkill, CraigslistSkill, ReminderSkill } from '@notention/core';

interface SkillDisplay {
    id: string;
    name: string;
    description: string;
    version: string;
    approved: boolean;
    autoExecute: boolean;
    domains: string[];
    requiresAuth: boolean;
    lastExecuted?: number;
    executionCount: number;
    successCount: number;
}

export function SkillManagementView() {
    const { settings, setSettings } = useSettings();
    const { addToast } = useToast();
    const [skills, setSkills] = useState<SkillDisplay[]>([]);
    const [history, setHistory] = useState<SkillExecutionRecord[]>([]);
    const [approvalDialog, setApprovalDialog] = useState<{
        isOpen: boolean;
        skillId: string | null;
        note: any | null;
    }>({ isOpen: false, skillId: null, note: null });
    const [executor] = useState(() => new SkillExecutor());

    useEffect(() => {
        try {
            executor.registerSkill(new IndeedSkill());
            executor.registerSkill(new GitHubSkill());
            executor.registerSkill(new CraigslistSkill());
            executor.registerSkill(new ReminderSkill());

            const approvals = executor.getApprovedSkills();
            const execHistory = executor.getExecutionHistory();
            
            const skillDisplays = executor.getAllSkills().map(skill => {
                const approval = approvals.find(a => a.skillId === skill.id);
                const skillHistory = execHistory.filter(h => h.skillId === skill.id);
                return {
                    id: skill.id,
                    name: skill.name,
                    description: skill.description,
                    version: skill.version,
                    approved: approval?.autoExecute ?? false,
                    autoExecute: approval?.autoExecute ?? false,
                    domains: skill.metadata?.domains || [],
                    requiresAuth: skill.metadata?.requiresAuth || false,
                    lastExecuted: skillHistory.length > 0 ? skillHistory[skillHistory.length - 1].timestamp : undefined,
                    executionCount: skillHistory.length,
                    successCount: skillHistory.filter(h => h.success).length
                };
            });

            setSkills(skillDisplays);
            setHistory(execHistory);
        } catch (err) {
            console.error('SkillManagementView useEffect error:', err);
        }
    }, []);

    const refreshSkills = useCallback(() => {
        const approvals = executor.getApprovedSkills();
        const execHistory = executor.getExecutionHistory();
        
        setSkills(prev => prev.map(skill => {
            const approval = approvals.find(a => a.skillId === skill.id);
            const skillHistory = execHistory.filter(h => h.skillId === skill.id);
            return {
                ...skill,
                approved: approval?.autoExecute ?? false,
                autoExecute: approval?.autoExecute ?? false,
                lastExecuted: skillHistory.length > 0 ? skillHistory[skillHistory.length - 1].timestamp : undefined,
                executionCount: skillHistory.length,
                successCount: skillHistory.filter(h => h.success).length
            };
        }));
        setHistory(execHistory);
    }, [executor]);

    const handleTestSkill = async (skillId: string) => {
        const skill = executor.getSkill(skillId);
        if (!skill) return;

        const testNote = {
            id: 'test-' + Date.now(),
            title: 'Test Note',
            content: 'Test content for skill execution',
            properties: [],
            tags: ['test'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            privacy: 'private' as const,
            priority: 0.5
        };

        const result = await executor.executeSkill(skillId, testNote as any, {
            onApprovalRequest: async (s, seq, reason) => {
                return new Promise(resolve => {
                    setApprovalDialog({
                        isOpen: true,
                        skillId,
                        note: { skill: s, sequence: seq, reason }
                    });
                });
            }
        });

        if (result.approvalRequired) {
            return;
        }

        if (result.success) {
            addToast(`${skill.name} executed successfully`, 'success');
        } else {
            addToast(`${skill.name} failed: ${result.error}`, 'error');
        }
        refreshSkills();
    };

    const handleApprove = (autoExecute: boolean) => {
        const { skillId, note } = approvalDialog;
        if (!skillId || !note) return;

        setApprovalDialog({ isOpen: false, skillId: null, note: null });

        executor.executeSkill(skillId, {
            id: 'test-' + Date.now(),
            title: 'Test Note',
            content: 'Test content',
            properties: [],
            tags: ['test'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            privacy: 'private',
            priority: 0.5
        } as any, {
            autoApprove: autoExecute
        }).then(result => {
            if (result.success) {
                addToast(`${note.skill.name} approved and executed`, 'success');
            } else {
                addToast(`${note.skill.name} failed: ${result.error}`, 'error');
            }
            refreshSkills();
        });
    };

    const handleReject = () => {
        setApprovalDialog({ isOpen: false, skillId: null, note: null });
        addToast('Skill execution rejected', 'info');
    };

    const handleRevokeApproval = (skillId: string) => {
        executor.revokeApproval(skillId);
        addToast('Approval revoked', 'success');
        refreshSkills();
    };

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return 'Never';
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Skills"
                description="Declarative translators that can act outside the workspace. Test them here and require approval before external actions."
            />

            <section className="rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[13px] font-medium text-[var(--app-text)]">Require approval</p>
                        <p className="mt-0.5 text-[12px] text-[var(--app-muted)]">
                            Skills request approval before executing an external action.
                        </p>
                    </div>
                    <Toggle
                        checked={true}
                        onChange={() => {}}
                        ariaLabel="Require approval"
                    />
                </div>
            </section>

            <div className="space-y-3">
                {skills.map(skill => (
                    <div key={skill.id} className="rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)]">
                        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[13px] font-semibold text-[var(--app-text)]">{skill.name}</h3>
                                    <Chip tone={skill.approved ? 'success' : 'neutral'} size="xs">
                                        {skill.approved ? 'Auto-execute' : 'Needs approval'}
                                    </Chip>
                                    <Chip size="xs">v{skill.version}</Chip>
                                </div>
                                <p className="mt-1 text-[12px] leading-5 text-[var(--app-muted)]">{skill.description}</p>
                                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--app-faint)]">
                                    <span className="flex items-center gap-1">
                                        <ClockIcon className="h-3 w-3"/>
                                        Last run {formatTime(skill.lastExecuted)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircleIcon className="h-3 w-3"/>
                                        {skill.successCount}/{skill.executionCount} successful
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                <Button variant="secondary" size="xs" onClick={() => handleTestSkill(skill.id)}>
                                    <PlayIcon className="mr-1 h-3 w-3"/>
                                    Test run
                                </Button>
                                {skill.approved && (
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => handleRevokeApproval(skill.id)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <XCircleIcon className="mr-1 h-3 w-3"/>
                                        Revoke
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2 border-t border-[var(--app-line)] p-3 sm:grid-cols-3">
                            <div className="rounded-md bg-[var(--app-raised)] p-2.5">
                                <div className="text-[11px] text-[var(--app-faint)]">External domains</div>
                                <div className="mt-1 text-[12px] text-[var(--app-text-secondary)]">
                                    {(skill.domains ?? []).length > 0 ? (
                                        (skill.domains ?? []).map(d => (
                                            <span key={d} className="mr-1 inline-block rounded border border-[var(--app-line)] px-1.5 py-0.5 text-[11px]">{d}</span>
                                        ))
                                    ) : (
                                        <span className="text-[var(--app-faint)]">None (local only)</span>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md bg-[var(--app-raised)] p-2.5">
                                <div className="text-[11px] text-[var(--app-faint)]">Authentication</div>
                                <div className="mt-1 text-[12px]">
                                    {skill.requiresAuth ? (
                                        <span className="text-amber-300">Required</span>
                                    ) : (
                                        <span className="text-[var(--app-muted)]">Not required</span>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-md bg-[var(--app-raised)] p-2.5">
                                <div className="text-[11px] text-[var(--app-faint)]">Status</div>
                                <div className="mt-1 text-[12px]">
                                    {skill.approved ? (
                                        <span className="flex items-center gap-1 text-emerald-300">
                                            <CheckCircleIcon className="h-3 w-3"/> Auto-approved
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[var(--app-muted)]">
                                            <ExclamationTriangleIcon className="h-3 w-3"/> Awaits approval
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {skills.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--app-line-strong)] p-8 text-center">
                        <ShieldIcon className="mx-auto mb-3 h-6 w-6 text-[var(--app-faint)]"/>
                        <p className="text-[13px] font-medium text-[var(--app-text-secondary)]">No skills registered</p>
                        <p className="mt-1 text-[12px] text-[var(--app-muted)]">Skills appear here when they are available.</p>
                    </div>
                )}
            </div>

            <section className="space-y-3">
                <SectionHeader title="Execution history" />
                {history.length === 0 ? (
                    <p className="rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-4 text-[12px] text-[var(--app-muted)]">
                        No executions yet.
                    </p>
                ) : (
                    <div className="divide-y divide-[var(--app-line)] overflow-hidden rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)]">
                        {history.slice(-20).reverse().map((record, index) => (
                            <div key={index} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                                <Chip tone={record.success ? 'success' : 'danger'} size="xs">
                                    {record.success ? 'Success' : 'Failed'}
                                </Chip>
                                <span className="font-mono text-[11px] text-[var(--app-text-secondary)]">{record.skillId}</span>
                                <span className="text-[11px] text-[var(--app-faint)]">note {record.noteId.slice(0, 8)}…</span>
                                <span className="ml-auto text-[11px] text-[var(--app-faint)]">{formatTime(record.timestamp)}</span>
                                {record.error && <div className="w-full text-[11px] text-red-400">{record.error}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <SkillApprovalDialog
                isOpen={approvalDialog.isOpen}
                onClose={handleReject}
                onApprove={handleApprove}
                onReject={handleReject}
                skillName={approvalDialog.note?.skill?.name || ''}
                skillDescription={approvalDialog.note?.skill?.description || ''}
                actions={approvalDialog.note?.sequence?.actions || []}
                domains={approvalDialog.note?.skill?.metadata?.domains || []}
                requiresAuth={approvalDialog.note?.skill?.metadata?.requiresAuth || false}
                expectedOutcome={approvalDialog.note?.sequence?.expectedOutcome}
                preview={approvalDialog.note?.reason}
            />
        </div>
    );
}
