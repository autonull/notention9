import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettingsContext';
import { useToast } from '../../hooks/useToast';
import { SkillExecutor, SkillExecutionRecord } from '@notention/core';
import { SkillApprovalDialog } from './SkillApprovalDialog';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Toggle } from '../ui/Primitives';
import { SettingsIcon, PlayIcon, ShieldIcon, XCircleIcon, TrashIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '../ui/icons';
import { cn } from '../../utils/ui';
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
        <div className="h-full bg-neutral-900 p-4 flex flex-col overflow-y-auto text-neutral-200">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ShieldIcon className="h-6 w-6 text-blue-400" />
                    Skill Approvals & Management
                </h1>
            </div>

            <div className="mb-6 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                <h3 className="font-medium text-neutral-300 mb-3">Approval Settings</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <label className="font-medium text-neutral-300">Require approval for skill execution</label>
                        <p className="text-sm text-neutral-400 mt-1">
                            When enabled, skills will request approval before executing external actions.
                        </p>
                    </div>
                    <Toggle
                        checked={true}
                        onChange={() => {}}
                        ariaLabel="Require approval"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {skills.map(skill => (
                    <Card key={skill.id} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-white">{skill.name}</h3>
                                    <Badge variant={skill.approved ? 'success' : 'outline'} size="sm">
                                        {skill.approved ? 'Auto-execute' : 'Requires approval'}
                                    </Badge>
                                    <Badge variant="outline" size="sm">v{skill.version}</Badge>
                                </div>
                                <p className="text-sm text-neutral-400 mb-3">{skill.description}</p>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                                    <div className="flex items-center gap-1">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>Last run: {formatTime(skill.lastExecuted)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span>{skill.successCount}/{skill.executionCount} successful</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleTestSkill(skill.id)}
                                >
                                    <PlayIcon className="w-4 h-4 mr-1" />
                                    Test Run
                                </Button>
                                {skill.approved && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRevokeApproval(skill.id)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        <XCircleIcon className="w-4 h-4 mr-1" />
                                        Revoke
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-neutral-700 grid gap-3 sm:grid-cols-3">
                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="text-xs text-neutral-400 mb-1">External Domains</div>
                                <div className="text-sm text-neutral-300">
                                    {skill.domains.length > 0 ? (
                                        skill.domains.map(d => (
                                            <span key={d} className="inline-block px-2 py-0.5 mr-1 mb-1 text-xs bg-purple-900/30 text-purple-300 rounded">{d}</span>
                                        ))
                                    ) : (
                                        <span className="text-neutral-400">None (local only)</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="text-xs text-neutral-400 mb-1">Authentication</div>
                                <div className="text-sm">
                                    {skill.requiresAuth ? (
                                        <span className="text-yellow-400">Required</span>
                                    ) : (
                                        <span className="text-green-400">Not required</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <div className="text-xs text-neutral-400 mb-1">Status</div>
                                <div className="text-sm">
                                    {skill.approved ? (
                                        <span className="text-green-400 flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" /> Auto-approved
                                        </span>
                                    ) : (
                                        <span className="text-yellow-400 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="w-3 h-3" /> Awaits approval
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {skills.length === 0 && (
                    <Card className="p-8 text-center">
                        <ShieldIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-300 mb-2">No skills registered</h3>
                        <p className="text-neutral-400">Skills will appear here when registered.</p>
                    </Card>
                )}
            </div>

            <div className="mt-6">
                <h3 className="font-medium text-neutral-300 mb-3">Execution History</h3>
                <div className="max-h-64 overflow-y-auto">
                    {history.length === 0 ? (
                        <Card className="p-8 text-center">
                            <ClockIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                            <p className="text-neutral-400">No execution history yet</p>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {history.slice(-20).reverse().map((record, index) => (
                                <Card key={index} className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge 
                                                variant={record.success ? 'success' : 'danger'}
                                                size="sm"
                                            >
                                                {record.success ? 'Success' : 'Failed'}
                                            </Badge>
                                            <span className="font-mono text-sm text-neutral-300">{record.skillId}</span>
                                            <span className="text-xs text-neutral-400">Note: {record.noteId.slice(0, 8)}...</span>
                                        </div>
                                        <span className="text-xs text-neutral-400">
                                            {formatTime(record.timestamp)}
                                        </span>
                                    </div>
                                    {record.error && (
                                        <div className="mt-1 text-sm text-red-400">{record.error}</div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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