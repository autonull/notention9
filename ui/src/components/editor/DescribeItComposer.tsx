import React, {useState} from 'react';
import type {OntologyNode, Property} from '@notention/core';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import {CheckIcon, SparklesIcon, XMarkIcon} from '../ui/icons';
import {useDescribeIt} from '../../hooks/useDescribeIt';
import {LmConsentModal} from '../modals/LmConsentModal';

interface DescribeItComposerProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (properties: Property[]) => void;
    ontology: OntologyNode[];
}

const SOURCE_LABEL: Record<string, string> = {
    heuristic: 'No model configured. Suggestions come from local rules.',
    'local-model': 'A model runs in this browser. Nothing leaves the device.',
    remote: 'A model runs elsewhere. The text leaves the device once you allow it.',
};

export function DescribeItComposer({isOpen, onClose, onApply, ontology}: DescribeItComposerProps) {
    const [text, setText] = useState('');
    const {
        proposals,
        accepted,
        status,
        error,
        providerKind,
        providerName,
        pendingRemoteText,
        suggest,
        allowRemote,
        declineRemote,
        accept,
        reject,
        reset
    } = useDescribeIt(ontology);

    const handleClose = () => {
        reset();
        setText('');
        onClose();
    };

    const handleApply = () => {
        if (accepted.length === 0) return;
        onApply(accepted);
        handleClose();
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleClose} title="Describe it" className="max-w-xl">
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                        Describe the note in your own words. Suggestions stay proposals until you accept them.
                    </p>

                    <textarea
                        data-testid="describe-it-input"
                        value={text}
                        onChange={event => setText(event.target.value)}
                        placeholder="e.g. I need a React developer for two weeks, up to 900 USD, starting next week"
                        rows={4}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900/70 p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
                    />

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500" data-testid="describe-it-source">
                            {SOURCE_LABEL[providerKind] ?? providerName}
                        </span>
                        <Button
                            data-testid="describe-it-suggest"
                            onClick={() => suggest(text)}
                            disabled={status === 'loading' || !text.trim()}
                            variant="primary"
                            icon={SparklesIcon}
                        >
                            {status === 'loading' ? 'Thinking…' : 'Suggest details'}
                        </Button>
                    </div>

                    {error && (
                        <div data-testid="describe-it-error" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    {proposals.length > 0 && (
                        <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Suggestions</div>
                            {proposals.map(proposal => (
                                <div
                                    key={`${proposal.property.key}-${proposal.property.operator}-${proposal.property.values.join(',')}`}
                                    data-testid="describe-it-suggestion"
                                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                        proposal.status === 'accepted'
                                            ? 'border-green-500/40 bg-green-500/10'
                                            : 'border-gray-700 bg-gray-900/70'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className="text-sm text-white">
                                            <span className="font-semibold">{proposal.property.key}</span>
                                            <span className="text-gray-400"> {proposal.property.operator} </span>
                                            <span className="text-gray-200">{proposal.property.values.join(', ')}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            {Math.round(proposal.confidence * 100)}% confidence
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            data-testid="describe-it-accept"
                                            onClick={() => accept(proposal)}
                                            title={`Accept ${proposal.property.key}`}
                                            aria-label={`Accept ${proposal.property.key}`}
                                            className="rounded-lg p-1.5 text-green-400 hover:bg-green-900/30 hover:text-green-300"
                                        >
                                            <CheckIcon className="w-4 h-4"/>
                                        </button>
                                        <button
                                            data-testid="describe-it-reject"
                                            onClick={() => reject(proposal)}
                                            title={`Reject ${proposal.property.key}`}
                                            aria-label={`Reject ${proposal.property.key}`}
                                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                                        >
                                            <XMarkIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {proposals.length === 0 && status === 'idle' && !error && (
                        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-4 text-center text-xs text-gray-500">
                            No suggestions yet. Describe the note and ask for details.
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-1">
                        <Button onClick={handleClose} variant="secondary">
                            Cancel
                        </Button>
                        <Button
                            data-testid="describe-it-apply"
                            onClick={handleApply}
                            disabled={accepted.length === 0}
                            variant="primary"
                        >
                            {accepted.length > 0 ? `Add ${accepted.length} detail${accepted.length > 1 ? 's' : ''}` : 'Add accepted details'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <LmConsentModal
                isOpen={pendingRemoteText !== null}
                onClose={declineRemote}
                onAllow={allowRemote}
                onDecline={declineRemote}
                providerName={providerName}
                text={pendingRemoteText ?? ''}
            />
        </>
    );
}
