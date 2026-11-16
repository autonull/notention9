import React, { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon, ExclamationTriangleIcon, ShieldIcon, GlobeIcon, KeyIcon } from '../ui/icons';
import { Button } from '../ui/Button';
import { cn } from '../../utils/ui';

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
    const [focusedElement, setFocusedElement] = useState<'approve' | 'reject' | 'autoExecute' | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setFocusedElement('reject');
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Enter' && focusedElement) {
                if (focusedElement === 'approve') {
                    onApprove(autoExecute);
                } else if (focusedElement === 'reject') {
                    onReject();
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const elements = ['reject', 'autoExecute', 'approve'] as const;
                const currentIndex = elements.indexOf(focusedElement);
                const nextIndex = (currentIndex + 1) % elements.length;
                setFocusedElement(elements[nextIndex]);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, focusedElement, autoExecute, onApprove, onReject, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="flex items-start justify-between p-4 border-b border-gray-700 bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 id="approval-title" className="text-lg font-bold text-white">Approval Required</h2>
                            <p className="text-sm text-gray-400">{skillName} wants to perform actions</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                        aria-label="Close dialog"
                    >
                        <XIcon className="w-5 h-5" />
                    </Button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
                    <div className="space-y-2">
                        <h3 className="font-medium text-white">{skillName}</h3>
                        <p className="text-sm text-gray-400">{skillDescription}</p>
                    </div>

                    {preview && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <h4 className="font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <ShieldIcon className="w-4 h-4 text-blue-400" />
                                What will happen
                            </h4>
                            <p className="text-sm text-gray-400 whitespace-pre-wrap">{preview}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-300 flex items-center gap-2">
                            <GlobeIcon className="w-4 h-4 text-purple-400" />
                            Capability Scope
                        </h4>
                        
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                    <GlobeIcon className="w-3 h-3" /> External Domains
                                </div>
                                <div className="text-sm text-gray-300">
                                    {domains.length > 0 ? (
                                        <ul className="space-y-1">
                                            {domains.map(domain => (
                                                <li key={domain} className="flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    {domain}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-gray-500">None (local only)</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                    <KeyIcon className="w-3 h-3" /> Authentication
                                </div>
                                <div className="text-sm">
                                    {requiresAuth ? (
                                        <span className="text-yellow-400 flex items-center gap-1">
                                            <ShieldIcon className="w-3 h-3" /> Required
                                        </span>
                                    ) : (
                                        <span className="text-green-400">Not required</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700 sm:col-span-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                    <CheckCircleIcon className="w-3 h-3" /> Expected Outcome
                                </div>
                                <div className="text-sm text-gray-300">{expectedOutcome || 'No specific outcome described'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-medium text-gray-300 flex items-center gap-2">
                            <ShieldIcon className="w-4 h-4 text-green-400" />
                            Actions to Execute
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {actions.map((action, index) => (
                                <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <span className="text-xs font-mono text-blue-400">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-200 capitalize">{action.type}</div>
                                        <div className="text-sm text-gray-400 truncate">{action.description}</div>
                                        {action.url && (
                                            <div className="text-xs text-blue-400 truncate mt-1">{action.url}</div>
                                        )}
                                        {action.selector && (
                                            <div className="text-xs text-gray-500 font-mono mt-1">{action.selector}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 bg-gray-800/50 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoExecute}
                            onChange={e => setAutoExecute(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                            id="auto-execute"
                        />
                        <span className="text-sm text-gray-300">
                            Remember this choice and auto-execute in the future
                        </span>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={onReject}
                            ref={el => { if (focusedElement === 'reject') el?.focus(); }}
                            className={cn(focusedElement === 'reject' && 'ring-2 ring-blue-500')}
                        >
                            Reject
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAutoExecute(!autoExecute)}
                            ref={el => { if (focusedElement === 'autoExecute') el?.focus(); }}
                            className={cn(focusedElement === 'autoExecute' && 'ring-2 ring-blue-500')}
                        >
                            {autoExecute ? '✓' : '☐'} Auto-execute
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => onApprove(autoExecute)}
                            ref={el => { if (focusedElement === 'approve') el?.focus(); }}
                            className={cn(focusedElement === 'approve' && 'ring-2 ring-blue-500')}
                        >
                            Approve & Execute
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}