import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { getRevisionStore } from '@notention/core/telemetry/revisionStore';
import { type Revision } from '@notention/core/telemetry/revisionStore';

const STATUS_COLORS: Record<string, string> = {
    draft: 'text-gray-400 bg-gray-800',
    evaluating: 'text-yellow-400 bg-yellow-900/30',
    evaluated: 'text-blue-400 bg-blue-900/30',
    'awaiting-consent': 'text-orange-400 bg-orange-900/30',
    consented: 'text-green-400 bg-green-900/30',
    active: 'text-green-300 bg-green-900/40',
    'rolled-back': 'text-red-400 bg-red-900/30',
    superseded: 'text-purple-400 bg-purple-900/30',
    rejected: 'text-red-400 bg-red-900/30',
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    evaluating: 'Evaluating',
    evaluated: 'Evaluated',
    'awaiting-consent': 'Awaiting Consent',
    consented: 'Consented',
    active: 'Active',
    'rolled-back': 'Rolled Back',
    superseded: 'Superseded',
    rejected: 'Rejected',
};

interface RevisionsTabProps {
    userId?: string;
}

export function RevisionsTab({ userId = 'default-user' }: RevisionsTabProps) {
    const { addToast } = useToast();
    const [revisions, setRevisions] = useState<Revision[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeam, setSelectedSeam] = useState<string>('capture');
    const [seamRoles] = useState<string[]>(['capture', 'elicit', 'match', 'layout']);

    const revisionStore = getRevisionStore();

    const loadRevisions = async () => {
        setLoading(true);
        try {
            const revs = await revisionStore.getBySeam(selectedSeam);
            setRevisions(revs);
        } catch (e) {
            addToast(`Failed to load revisions: ${e instanceof Error ? e.message : String(e)}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRevisions();
    }, [selectedSeam]);

    const handleConsent = async (revisionId: string, grant: boolean) => {
        try {
            if (grant) {
                await revisionStore.grantConsent(revisionId, userId);
                addToast('Consent granted', 'success');
            } else {
                await revisionStore.denyConsent(revisionId, userId, 'Denied by user');
                addToast('Consent denied', 'info');
            }
            loadRevisions();
        } catch (e) {
            addToast(`Failed to ${grant ? 'grant' : 'deny'} consent: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    };

    const handleActivate = async (revisionId: string) => {
        try {
            await revisionStore.activate(revisionId, userId);
            addToast('Revision activated', 'success');
            loadRevisions();
        } catch (e) {
            addToast(`Failed to activate: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    };

    const handleRollback = async (revisionId: string) => {
        try {
            await revisionStore.updateStatus(revisionId, 'rolled-back', {
                rollbackReason: 'Manual rollback by user',
                rolledBackAt: new Date().toISOString(),
            });
            addToast('Revision rolled back', 'success');
            loadRevisions();
        } catch (e) {
            addToast(`Failed to rollback: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        const color = STATUS_COLORS[status] ?? 'text-gray-400 bg-gray-800';
        const label = STATUS_LABELS[status] ?? status;
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
                {label}
            </span>
        );
    };

    return (
        <div className="bg-gray-900/70 p-6 rounded-lg animate-fade-in space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-3">
                    <span className="h-6 w-6 text-blue-400">📋</span>
                    Strategy Revisions
                </h2>
                <p className="text-sm text-gray-400">
                    Manage proposed strategy changes. Revisions require consent before activation.
                </p>
            </div>

            <div className="flex gap-4 mb-4">
                <select
                    value={selectedSeam}
                    onChange={e => setSelectedSeam(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                >
                    {seamRoles.map(role => (
                        <option key={role} value={role}>&{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-8 text-gray-500">Loading revisions...</div>
            ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No revisions for {selectedSeam}. Create one with <code>pnpm eval revision:create --seam {selectedSeam}</code>
                </div>
            ) : (
                <div className="space-y-3">
                    {revisions.map(revision => (
                        <div
                            key={revision.id}
                            className={`p-4 rounded-lg border ${
                                revision.status === 'active'
                                    ? 'border-green-500/50 bg-green-500/10'
                                    : 'border-gray-700 bg-gray-800/50'
                            }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <code className="text-xs bg-gray-900 px-2 py-1 rounded font-mono">
                                                {revision.id}
                                            </code>
                                            {getStatusBadge(revision.status)}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-400">
                                            <span>Author: {revision.author}</span>
                                            <span>Created: {formatDate(revision.createdAt)}</span>
                                            {revision.consentedAt && (
                                                <span>Consented: {formatDate(revision.consentedAt)}</span>
                                            )}
                                            {revision.activatedAt && (
                                                <span className="text-green-400">Active: {formatDate(revision.activatedAt)}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <details className="group">
                                            <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                <span>Params</span>
                                                <span className="text-gray-500">▼</span>
                                            </summary>
                                            <div className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 font-mono max-h-40 overflow-auto">
                                                {JSON.stringify(revision.strategy.params ?? {}, null, 2)}
                                            </div>
                                        </details>

                                        {revision.status === 'awaiting-consent' && (
                                            <>
                                                <button
                                                    onClick={() => handleConsent(revision.id, true)}
                                                    className="px-3 py-1.5 text-sm bg-green-900/50 border border-green-500 text-green-300 rounded-lg hover:bg-green-900 transition-colors"
                                                >
                                                    Grant Consent
                                                </button>
                                                <button
                                                    onClick={() => handleConsent(revision.id, false)}
                                                    className="px-3 py-1.5 text-sm bg-red-900/50 border border-red-500 text-red-300 rounded-lg hover:bg-red-900 transition-colors"
                                                >
                                                    Deny
                                                </button>
                                            </>
                                        )}

                                        {revision.status === 'consented' && (
                                            <button
                                                onClick={() => handleActivate(revision.id)}
                                                className="px-3 py-1.5 text-sm bg-blue-900/50 border border-blue-500 text-blue-300 rounded-lg hover:bg-blue-900 transition-colors"
                                            >
                                                Activate
                                            </button>
                                        )}

                                        {revision.status === 'active' && (
                                            <button
                                                onClick={() => handleRollback(revision.id)}
                                                className="px-3 py-1.5 text-sm bg-red-900/50 border border-red-500 text-red-300 rounded-lg hover:bg-red-900 transition-colors"
                                            >
                                                Rollback
                                            </button>
                                        )}

                                        {revision.status === 'draft' && (
                                            <button
                                                onClick={() => handleConsent(revision.id, true)}
                                                className="px-3 py-1.5 text-sm bg-orange-900/50 border border-orange-500 text-orange-300 rounded-lg hover:bg-orange-900 transition-colors"
                                            >
                                                Request Consent
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}