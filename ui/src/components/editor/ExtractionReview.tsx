import React from 'react';
import {CheckIcon, SparklesIcon, XMarkIcon} from '../common/icons';
import type {PropertyReviewItem} from '../../hooks/usePropertyReview';
import {Button} from '../common/Button';

interface ExtractionReviewProps {
    items: PropertyReviewItem[];
    onAccept: (item: PropertyReviewItem) => void;
    onReject: (item: PropertyReviewItem) => void;
}

export function ExtractionReview({items, onAccept, onReject}: ExtractionReviewProps) {
    if (items.length === 0) return null;

    return (
        <div className="pt-3 border-t border-gray-800 mt-2" data-testid="extraction-review">
            <div className="flex items-center gap-2 mb-2 px-1">
                <SparklesIcon className="w-3 h-3 text-purple-400"/>
                <span className="text-xs font-bold text-gray-400 uppercase">Review suggestions</span>
                <span className="text-[10px] text-gray-600">{items.length}</span>
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
                                <span className="text-gray-500">{item.property.operator}</span>
                                <span className="text-gray-300 truncate">{item.property.values.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="h-1 w-14 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-purple-400"
                                        style={{width: `${item.confidence * 100}%`}}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-gray-500">
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
                                className="text-gray-500 hover:text-red-300"
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
