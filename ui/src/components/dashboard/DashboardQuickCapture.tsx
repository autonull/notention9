import React, {useState, useCallback, useMemo} from 'react';
import {useView} from '../../hooks/useViewContext';
import {useNotes} from '../../hooks/useNotes';
import {useSettings} from '../../hooks/useSettingsContext';
import {PropertyExtractor} from '@notention/core';
import {sanitizeHTML} from '../../utils/sanitize';
import {Input} from '../ui';
import {Button} from '../ui';
import {Badge} from '../ui';
import {cn} from '../../utils/ui';
import {
    ArrowRightIcon,
    SearchIcon,
    TagIcon,
    SparklesIcon,
    BoltIcon,
    MagicWandIcon,
    ShieldIcon,
    PlusIcon,
    LightBulbIcon,
    CheckCircleIcon,
    NoteIcon,
} from '../ui/icons';
import {modShortcut} from '../../utils/platform';
import {getTextFromHtml} from '@notention/core';

interface QuickCaptureTemplate {
    title: string | (() => string);
    content: string;
    properties: Array<{key: string; operator: string; values: string[]}>;
    tags: string[];
    icon: React.ComponentType<{className?: string}>;
    color: string;
    bgColor: string;
    borderColor: string;
    gradient: string;
}

const TEMPLATES: Record<string, QuickCaptureTemplate> = {
    task: {
        title: 'New Task',
        content: '<p>Describe task...</p>',
        properties: [{key: 'status', operator: 'is', values: ['todo']}],
        tags: ['task'],
        icon: CheckCircleIcon,
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-500/30',
        gradient: 'gradient-success'
    },
    journal: {
        title: () => new Date().toLocaleDateString(),
        content: '<p>Thoughts...</p>',
        properties: [{key: 'type', operator: 'is', values: ['journal']}],
        tags: ['journal'],
        icon: NoteIcon,
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/20',
        borderColor: 'border-blue-500/30',
        gradient: 'gradient-primary'
    },
    idea: {
        title: 'New Idea',
        content: '<p>Idea description...</p>',
        properties: [{key: 'type', operator: 'is', values: ['idea']}],
        tags: ['idea'],
        icon: LightBulbIcon,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-500/30',
        gradient: 'gradient-warning'
    }
};

const QUICK_CAPTURE_MARKUP = /(?:^|\s)(?:#[\w-]+|\b[\w.-]+:\S+)/g;

const deriveQuickNoteTitle = (input: string): string =>
    getTextFromHtml(input).replace(QUICK_CAPTURE_MARKUP, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Quick Note';

const deriveQuickTags = (input: string): string[] =>
    [...new Set(Array.from(input.matchAll(/#([\w-]+)/g), match => match[1].toLowerCase()))];

const FEATURE_HIGHLIGHTS = [
    {icon: BoltIcon, title: 'Semantic Extraction', desc: 'Auto-detect properties from natural language'},
    {icon: MagicWandIcon, title: 'Smart Matching', desc: 'Discover connections between requests & offers'},
    {icon: ShieldIcon, title: 'Local-First', desc: 'Your data stays on your device by default'},
];

interface DashboardQuickCaptureProps {
    onCreateNote: () => void;
    loadSampleWorkspace?: () => void;
    showSampleWorkspace?: boolean;
}

export function DashboardQuickCapture({onCreateNote, loadSampleWorkspace, showSampleWorkspace = false}: DashboardQuickCaptureProps) {
    const {addNote, setSelectedNoteId, setActiveView} = useNotes();
    const {settings} = useSettings();
    const [quickCaptureInput, setQuickCaptureInput] = useState('');
    const [showFeatures, setShowFeatures] = useState(false);

    const extractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);
    const extractedProps = useMemo(() => {
        if (!quickCaptureInput.trim()) return [];
        return extractor.extractFromText(quickCaptureInput);
    }, [quickCaptureInput, extractor]);

    const handleQuickCapture = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCaptureInput.trim()) return;

        const note = addNote({
            title: deriveQuickNoteTitle(quickCaptureInput),
            content: sanitizeHTML(`<p>${quickCaptureInput}</p>`),
            tags: ['quick-capture', ...deriveQuickTags(quickCaptureInput)],
            properties: extractedProps
        });

        setSelectedNoteId(note.id);
        setActiveView('notes');
        setQuickCaptureInput('');
    }, [quickCaptureInput, extractedProps, addNote, setSelectedNoteId, setActiveView]);

    const handleQuickTemplate = useCallback((type: keyof typeof TEMPLATES) => {
        const template = TEMPLATES[type];
        const title = typeof template.title === 'function' ? template.title() : template.title;

        const note = addNote({
            title,
            content: template.content,
            tags: template.tags,
            properties: template.properties
        });
        setSelectedNoteId(note.id);
        setActiveView('notes');
    }, [addNote, setSelectedNoteId, setActiveView]);

    const hasNotes = false; // This will be passed from parent or derived from notes

    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/80 p-6 md:p-8 animate-fade-in-up stagger-1">
            <div className="relative z-10 max-w-2xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight text-white">
                    Quick Capture
                </h2>
                <p className="text-gray-500 text-sm mb-6 font-medium">
                    Instant notes, tasks, and ideas with semantic extraction.
                </p>

                <form onSubmit={handleQuickCapture} className="relative mb-6">
                    <div className="relative">
                        <Input
                            value={quickCaptureInput}
                            onChange={(e) => setQuickCaptureInput(e.target.value)}
                            placeholder={`What's on your mind? Try: "Buy milk #shopping" or "Meeting at 3pm"`}
                            leftIcon={<SearchIcon className="w-5 h-5" />}
                            className="text-lg py-4 pr-16"
                            autoComplete="off"
                        />
                        <Button
                            type="submit"
                            disabled={!quickCaptureInput.trim()}
                            size="lg"
                            className="absolute right-2 top-1/2 -translate-y-1/2 touch-target-48"
                            aria-label="Create note"
                        >
                            <ArrowRightIcon className="w-5 h-5"/>
                        </Button>
                    </div>
                </form>

                {/* Semantic Preview */}
                {(extractedProps.length > 0 || quickCaptureInput.includes('#')) && (
                    <div className="flex flex-wrap justify-center gap-2 mb-6 min-h-[28px] animate-fade-in">
                        {extractedProps.map((prop, idx) => (
                            <Badge
                                key={`${prop.key}-${idx}`}
                                variant="purple"
                                size="sm"
                                pill
                                icon={<SparklesIcon className="w-3 h-3" />}
                            >
                                {prop.key}: {prop.values.join(', ')}
                            </Badge>
                        ))}
                        {quickCaptureInput.includes('#') && quickCaptureInput.split('#').slice(1).map((tag, idx) => (
                            <Badge
                                key={`tag-${idx}`}
                                variant="info"
                                size="sm"
                                pill
                                icon={<TagIcon className="w-3 h-3" />}
                            >
                                #{tag.split(' ')[0]}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Quick Templates */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {(Object.entries(TEMPLATES) as [string, QuickCaptureTemplate][]).map(([type, t]) => (
                        <Button
                            key={type}
                            onClick={() => handleQuickTemplate(type as keyof typeof TEMPLATES)}
                            variant="outline"
                            size="sm"
                            className={cn('gap-2', t.borderColor, 'hover:scale-105 active:scale-95 touch-target-48')}
                            leftIcon={
                                <div className={cn('p-2 rounded-xl', t.gradient, 'text-white')}>
                                    <t.icon className="w-4 h-4" />
                                </div>
                            }
                        >
                            <span className={cn('text-[10px] font-bold uppercase tracking-widest', t.color)}>
                                {type}
                            </span>
                        </Button>
                    ))}
                </div>

                {/* Tips */}
                <details className="group text-left max-w-md mx-auto">
                    <summary className="flex items-center justify-center gap-2 text-gray-500 text-sm cursor-pointer select-none">
                        <span>Capture tips</span>
                        <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                    </summary>
                    <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 text-sm text-gray-400 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">#tag</kbd><span>Add tags inline</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">key:value</kbd><span>Add properties</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">@mention</kbd><span>Reference other notes</span></div>
                        <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">[link]</kbd><span>Create wiki-links</span></div>
                    </div>
                </details>

                {/* Background decoration */}
                <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-3xl" />
                </div>
            </div>
        </section>
    );
}