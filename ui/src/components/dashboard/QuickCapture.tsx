import React from 'react';
import {Button, Input, Badge} from '../ui/Primitives';
import {SearchIcon, TagIcon, SparklesIcon, ArrowRightIcon} from '../common/icons';
import {cn} from '../../utils/ui';

interface QuickCaptureProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    extractedProps: Array<{key: string; values: string[]}>;
    onTemplateClick: (type: string) => void;
}

const TEMPLATES = {
    task: {
        title: 'New Task',
        icon: 'check',
        color: 'text-green-400',
        borderColor: 'border-green-500/30',
        gradient: 'gradient-success'
    },
    journal: {
        title: 'Journal',
        icon: 'note',
        color: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        gradient: 'gradient-primary'
    },
    idea: {
        title: 'Idea',
        icon: 'lightbulb',
        color: 'text-yellow-400',
        borderColor: 'border-yellow-500/30',
        gradient: 'gradient-warning'
    }
};

const ICON_MAP = {
    check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    note: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-1 1.73V21a2 2 0 01-2 2h-2.5"/></svg>,
    lightbulb: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
};

export function QuickCapture({input, onInputChange, onSubmit, extractedProps, onTemplateClick}: QuickCaptureProps) {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/80 p-6 md:p-8 animate-fade-in-up stagger-1">
            <div className="relative z-10 max-w-2xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight text-white">
                    Quick Capture
                </h2>
                <p className="text-gray-500 text-sm mb-6 font-medium">
                    Instant notes, tasks, and ideas with semantic extraction.
                </p>

                <form onSubmit={onSubmit} className="relative mb-6">
                    <div className="relative">
                        <Input
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder={`What's on your mind? Try: "Buy milk #shopping" or "Meeting at 3pm"`}
                            leftIcon={<SearchIcon className="w-5 h-5" />}
                            className="text-lg py-4 pr-16"
                            autoComplete="off"
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim()}
                            size="lg"
                            className="absolute right-2 top-1/2 -translate-y-1/2 touch-target-48"
                            aria-label="Create note"
                        >
                            <ArrowRightIcon className="w-5 h-5"/>
                        </Button>
                    </div>
                </form>

                {(extractedProps.length > 0 || input.includes('#')) && (
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
                        {input.includes('#') && input.split('#').slice(1).map((tag, idx) => (
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

                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {(Object.entries(TEMPLATES) as [string, typeof TEMPLATES['task']][]).map(([type, t]) => (
                        <Button
                            key={type}
                            onClick={() => onTemplateClick(type)}
                            variant="outline"
                            size="sm"
                            className={cn('gap-2', t.borderColor, 'hover:scale-105 active:scale-95 touch-target-48')}
                            leftIcon={
                                <div className={cn('p-2 rounded-xl', t.gradient, 'text-white')}>
                                    {ICON_MAP[type as keyof typeof ICON_MAP] || ICON_MAP.note}
                                </div>
                            }
                        >
                            <span className={cn('text-[10px] font-bold uppercase tracking-widest', t.color)}>
                                {type}
                            </span>
                        </Button>
                    ))}
                </div>

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
            </div>

            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-3xl" />
            </div>
        </section>
    );
}