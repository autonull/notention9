import React from 'react';
import type {Property} from '@notention/core';
import {CheckIcon, SparklesIcon, XMarkIcon, CpuChipIcon, BrainIcon} from '../ui/icons';
import type {PropertyReviewItem} from '../../hooks/usePropertyReview';
import {Button} from '../ui/Button';

interface ExtractionReviewProps {
    items: PropertyReviewItem[];
    onAccept: (item: PropertyReviewItem) => void;
    onReject: (item: PropertyReviewItem) => void;
}

function ProvenanceBadge({provenance}: {provenance?: Property['provenance']}) {
    if (!provenance) return null;

    const isDeterministic = provenance === 'deterministic' || provenance === 'pattern';
    const isAI = provenance === 'ai';

    return (
        <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${isDeterministic
                ? 'bg-amber-900/30 text-amber-300 border border-amber-800'
                : isAI
                    ? 'bg-green-900/30 text-green-300 border border-green-800'
                    : 'bg-neutral-800 text-neutral-300'}`}
            title={`Property source: ${provenance}`}
        >
            {isDeterministic && <CpuChipIcon className="w-2.5 h-2.5" />}
            {isAI && <BrainIcon className="w-2.5 h-2.5" />}
            {provenance}
            {isDeterministic && <span className="text-amber-400" aria-label="Degraded: fallback extraction">⚠</span>}
        </span>
    );
}

export function ExtractionReview({items, onAccept, onReject}: ExtractionReviewProps) {
    if (items.length === 0) return null;

    // Check if any items have deterministic provenance (degraded)
    const hasDegraded = items.some(item =>
        item.property.provenance === 'deterministic' || item.property.provenance === 'pattern'
    );

    return (
        <div className="pt-3 border-t border-neutral-800 mt-2" data-testid="extraction-review">
            <div className="flex items-center gap-2 mb-2 px-1">
                <SparklesIcon className="w-3 h-3 text-purple-400"/>
 <span className="text-xs font-bold text-neutral-400">Review suggestions</span>
                <span className="text-xs text-neutral-400">{items.length}</span>
                {hasDegraded && (
                    <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/30 border border-amber-800 text-amber-300 text-xs font-medium">
                        <CpuChipIcon className="w-3 h-3" />
                        Degraded mode (fallback)
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {items.map(item => (
                    <div
                        key={`${item.property.key}-${item.property.operator}-${item.property.values.join(',')}`}
                        className="bg-purple-900/10 border border-purple-500/20 rounded p-2 flex justify-between items-center gap-2"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-purple-200 truncate">{item.property.key}</span>
                                <span className="text-neutral-400">{item.property.operator}</span>
                                <span className="text-neutral-300 truncate">{item.property.values.join(', ')}</span>
                                <ProvenanceBadge provenance={item.property.provenance} />
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="h-1 w-14 bg-neutral-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-purple-400"
                                        style={{width: `${item.confidence * 100}%`}}
                                    />
                                </div>
                                <span className="text-xs font-mono text-neutral-400">
                                    {Math.round(item.confidence * 100)}%
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                                size="xs"
                                variant="ghost"
                                className="text-green-400 hover:text-green-200"
                                onClick={() => onAccept(item)}
                                title={`Accept ${item.property.key}`}
                            >
                                <CheckIcon className="w-4 h-4"/>
                            </Button>
                            <Button
                                size="xs"
                                variant="ghost"
                                className="text-neutral-400 hover:text-red-300"
                                onClick={() => onReject(item)}
                                title={`Reject ${item.property.key}`}
                            >
                                <XMarkIcon className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
