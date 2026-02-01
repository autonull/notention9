import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';
import { Textarea } from '../common/Textarea';
import { SparklesIcon, SendIcon } from '../common/icons';
import type { Property } from '@notention/core';
import { PropertyWidget } from './PropertyWidget';
import { useDebounce } from '../../hooks/useDebounce';
import { useGardener } from '../../hooks/useGardener';
import { useSettings } from '../../hooks/useSettingsContext';
import { useNoteActions } from '../../hooks/useNoteActions';

export function HybridInput() {
    const [text, setText] = useState('');
    const [suggestedProps, setSuggestedProps] = useState<Property[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { settings } = useSettings();
    const { extractProperties } = useGardener();
    const { createNoteAndNavigate } = useNoteActions();

    const debouncedText = useDebounce(text, 800);

    useEffect(() => {
        const runExtraction = async () => {
            if (debouncedText.length < 15) {
                if (debouncedText.length === 0) setSuggestedProps([]);
                return;
            }

            setIsExtracting(true);
            try {
                const props = await extractProperties(debouncedText, settings.ontology);
                setSuggestedProps(props);
            } catch (e) {
                console.error(e);
            } finally {
                setIsExtracting(false);
            }
        };

        runExtraction();
    }, [debouncedText, extractProperties, settings.ontology]);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setIsCreating(true);

        try {
            const title = text.length < 50 ? text : text.slice(0, 40) + '...';

            createNoteAndNavigate(title, text, suggestedProps);

            setText('');
            setSuggestedProps([]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit();
        }
    }

    return (
        <div className="hybrid-input relative group">
            <div className="relative z-10">
                <Textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe a project, an offer, or just take a note... (e.g. 'I need a React developer for $100')"
                    className="w-full bg-gray-900/80 border-gray-700 focus:border-purple-500/50 min-h-[100px] text-lg mb-4"
                />

                {/* Suggested Properties Area */}
                {(suggestedProps.length > 0 || isExtracting) && (
                    <div className="mb-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" />
                                {isExtracting ? 'Extracting...' : 'Proposed Properties'}
                            </h4>
                            {isExtracting && <div className="animate-pulse text-purple-400 text-xs">AI Working...</div>}
                        </div>

                        <div className="space-y-1">
                            {suggestedProps.map((prop, idx) => (
                                <PropertyWidget
                                    key={idx}
                                    property={prop}
                                    onChange={(updated) => {
                                        const next = [...suggestedProps];
                                        next[idx] = updated;
                                        setSuggestedProps(next);
                                    }}
                                    onRemove={() => {
                                        setSuggestedProps(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                    ontology={settings.ontology}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                        <kbd className="bg-gray-700 px-1 rounded">Ctrl+Enter</kbd> to save
                    </span>
                    <Button
                        onClick={handleSubmit}
                        disabled={!text.trim() || isCreating}
                        isLoading={isCreating}
                        variant="primary"
                        icon={SendIcon}
                        className="bg-purple-600 hover:bg-purple-500"
                    >
                        Create Note {suggestedProps.length > 0 && `(+${suggestedProps.length} props)`}
                    </Button>
                </div>
            </div>
        </div>
    );
}
