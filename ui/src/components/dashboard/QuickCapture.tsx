import React from 'react';
import {useIsMobile} from '../../hooks/useMediaQuery';
import {Badge} from '../ui/Badge';
import {Input} from '../ui/Input';
import {Button} from '../ui/Button';
import {SearchIcon, TagIcon, SparklesIcon, ArrowRightIcon} from '../ui/icons';
import {cn} from '../../utils/ui';
import {ExtractionStatus, ExtractionProviderBadge} from '../ui/Primitives';

interface QuickCaptureProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    extractedProps: Array<{key: string; operator: string; values: string[]}>;
    onTemplateClick: (type: string) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    /** Strategy param: guidance shown in the capture field */
    placeholder?: string;
    /** Strategy param: focus the capture field on mount */
    autoFocus?: boolean;
    /** Extraction status for AI/heuristic fallback indication */
    extractionLoading?: boolean;
    extractionFallbackUsed?: boolean;
    extractionProviderUsed?: string;
    extractionProviderKind?: string;
    extractionError?: Error | null;
    extractionRetry?: () => void;
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

export function QuickCapture({
    input,
    onInputChange,
    onSubmit,
    extractedProps,
    onTemplateClick,
    onFocus,
    onBlur,
    placeholder,
    autoFocus,
    extractionLoading,
    extractionFallbackUsed,
    extractionProviderUsed,
    extractionProviderKind,
    extractionError,
    extractionRetry,
}: QuickCaptureProps) {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isMobile = useIsMobile();

    React.useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    const showExtractionStatus = extractionLoading || extractionFallbackUsed || extractionError;

    return (
        <section className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50 p-4 animate-fade-in-up stagger-1">
            <div className="relative z-10 max-w-3xl mx-auto">
                <form onSubmit={onSubmit} className="relative">
                    <div className="relative">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            placeholder={isMobile ? "What's on your mind?" : placeholder ?? `What's on your mind? Try: "Buy milk #shopping" or "Meeting at 3pm"`}
                            leftIcon={<SearchIcon className="w-5 h-5" />}
                            className="text-lg py-4 pr-16"
                            autoComplete="off"
                            data-testid="quick-capture-input"
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

                {showExtractionStatus && (
                    <div className="mb-4" data-testid="extraction-status">
                        <ExtractionStatus
                            loading={extractionLoading}
                            fallbackUsed={extractionFallbackUsed}
                            providerUsed={extractionProviderUsed}
                            providerKind={extractionProviderKind}
                            error={extractionError}
                            onRetry={extractionRetry}
                        />
                    </div>
                )}

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

                {showExtractionStatus && extractionProviderUsed && (
                    <div className="mb-4 flex justify-center" data-testid="extraction-provider-badge">
                        <ExtractionProviderBadge
                            providerUsed={extractionProviderUsed}
                            providerKind={extractionProviderKind}
                            fallbackUsed={extractionFallbackUsed}
                        />
                    </div>
                )}

                <details className="mt-3 group">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 list-none flex items-center gap-1.5">
                        <span className="transition-transform group-open:rotate-90">›</span>
                        More ways to capture
                    </summary>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {(Object.entries(TEMPLATES) as [string, typeof TEMPLATES['task']][]).map(([type, t]) => (
                            <Button
                                key={type}
                                onClick={() => onTemplateClick(type)}
                                variant="outline"
                                size="sm"
                                className={cn('gap-2', t.borderColor, 'touch-target-48')}
                                leftIcon={
                                    <div className={cn('p-1.5 rounded-lg', t.gradient, 'text-white')}>
                                        {ICON_MAP[t.icon as keyof typeof ICON_MAP]}
                                    </div>
                                }
                            >
                                {t.title}
                            </Button>
                        ))}
                    </div>
                </details>

                <details className="group mt-2">
                    <summary className="flex items-center gap-2 text-gray-500 text-xs cursor-pointer select-none list-none">
                        <span className="text-gray-400">Capture tips</span>
                        <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                    </summary>
                    <div className="mt-2 p-3 bg-gray-950/50 rounded-xl border border-gray-800 text-xs text-gray-400 space-y-1.5 animate-fade-in">
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