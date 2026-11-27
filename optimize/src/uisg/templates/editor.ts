import type { UisgSurface, UisgGraph } from '../types.js';
import type { TemplateTarget } from './render.js';
import { BaseTemplate } from './base.js';

export const editorTemplate = new (class extends BaseTemplate {
  constructor() {
    super({
      shape: 'editor',
      name: 'editor',
      description: 'Rich text editor with property suggestions, proposals, and AI integration',
      defaultImports: [
        'import React, { useRef, useCallback, useEffect, useState } from \'react\';',
        'import { cn } from \'../../utils/ui\';',
        'import { Button } from \'../ui/Button\';',
        'import { tone } from \'../../styles/tone\';',
        'import { CheckIcon, XMarkIcon, SparklesIcon, Loader2Icon, AlertCircleIcon } from \'../ui/icons\';',
        'import type { OntologyNode } from \'@notention/core\';',
      ],
      defaultTestImports: [
        'import { render, screen, fireEvent } from \'@testing-library/react\';',
        'import { describe, it, expect, vi } from \'vitest\';',
      ],
    });
  }

  generateComponent(surface: UisgSurface, _graph: UisgGraph, target: TemplateTarget): string {
    if (target !== 'react') return this.generateNonReactComponent(surface, target);

    const componentName = this.deriveComponentName(surface);
    const testId = this.deriveTestId(surface);

    return `${this.generateHeader(surface)}
${this.getCommonImports(surface, target).join('\n')}

interface ${componentName}Props {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    autoFocus?: boolean;
    ontology?: Array<{
        id: string;
        label: string;
        type: string;
        values?: string[];
        unit?: string;
    }>;
    proposals?: Array<{
        property: {
            key: string;
            operator: string;
            values: string[];
            role: string;
            confidence: number;
            provenance: string;
        };
        confidence: number;
        status: 'pending' | 'accepted' | 'rejected';
    }>;
    onAcceptProposal?: (property: ${componentName}Props['proposals'][0]['property']) => void;
    onRejectProposal?: (property: ${componentName}Props['proposals'][0]['property']) => void;
    onSuggest?: (value: string) => void;
    suggestStatus?: 'idle' | 'loading' | 'error';
    suggestError?: string | null;
    providerKind?: 'heuristic' | 'local-model' | 'remote';
    className?: string;
    testId?: string;
}

const PROPOSAL_TONES: Record<string, keyof typeof tone> = {
    pending: 'accent',
    accepted: 'success',
    rejected: 'danger',
};

export function ${componentName}({
    value = '',
    onChange,
    placeholder = 'Type / for properties…',
    readOnly = false,
    autoFocus = false,
    ontology = [],
    proposals = [],
    onAcceptProposal,
    onRejectProposal,
    onSuggest,
    suggestStatus = 'idle',
    suggestError,
    providerKind,
    className,
    testId = '${testId}',
}: ${componentName}Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(0);

    useEffect(() => {
        if (autoFocus) {
            textareaRef.current?.focus();
        }
    }, [autoFocus]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
    }, [onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === '/' && !readOnly) {
            e.preventDefault();
            setShowSuggestions(true);
            setSuggestionIndex(0);
        } else if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex(i => Math.min(i + 1, ontology.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const selected = ontology[suggestionIndex];
                if (selected) {
                    const newValue = value + selected.id + ': ';
                    onChange?.(newValue);
                }
                setShowSuggestions(false);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        }
    }, [value, onChange, ontology.length, readOnly, showSuggestions, suggestionIndex]);

    const handleAccept = useCallback((proposal: ${componentName}Props['proposals'][0]) => {
        onAcceptProposal?.(proposal.property);
    }, [onAcceptProposal]);

    const handleReject = useCallback((proposal: ${componentName}Props['proposals'][0]) => {
        onRejectProposal?.(proposal.property);
    }, [onRejectProposal]);

    const pendingProposals = proposals.filter(p => p.status === 'pending');
    const acceptedProposals = proposals.filter(p => p.status === 'accepted');

    return (
        <div className={cn('editor-wrapper', className)} data-testid={testId}>
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className={cn(
                        'w-full min-h-[100px] p-3 rounded-lg border bg-[var(--app-surface)] text-[var(--app-text)]',
                        'placeholder-[var(--app-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]',
                        'transition-colors resize-none font-mono text-sm leading-relaxed',
                        readOnly && 'opacity-60 cursor-not-allowed',
                        'border-[var(--app-line)]'
                    )}
                    data-testid={testId + '-input'}
                    aria-label="Editor content"
                    aria-describedby={showSuggestions ? testId + '-suggestions' : undefined}
                />

                {showSuggestions && ontology.length > 0 && (
                    <div
                        id={testId + '-suggestions'}
                        className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] shadow-lg z-10"
                        data-testid={testId + '-suggestions'}
                        role="listbox"
                        aria-label="Property suggestions"
                    >
                        {ontology.map((node, i) => (
                            <button
                                key={node.id}
                                type="button"
                                onClick={() => {
                                    const newValue = value + node.id + ': ';
                                    onChange?.(newValue);
                                    setShowSuggestions(false);
                                }}
                                onMouseEnter={() => setSuggestionIndex(i)}
                                className={cn(
                                    'w-full px-3 py-2 text-left text-sm transition-colors',
                                    i === suggestionIndex
                                        ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                                        : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-raised)] hover:text-[var(--app-text)]'
                                )}
                                role="option"
                                aria-selected={i === suggestionIndex}
                                data-testid={testId + '-suggestion-' + node.id}
                            >
                                <div className="font-medium">{node.label}</div>
                                <div className="text-[11px] text-[var(--app-muted)]">{node.type}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {pendingProposals.length > 0 && (
                <div className="mt-3 space-y-2" data-testid={testId + '-proposals'}>
                    {pendingProposals.map((proposal, i) => {
                        const prop = proposal.property;
                        const proposalTone = PROPOSAL_TONES.pending;
                        const t = tone[proposalTone];
                        return (
                            <div key={i} className={cn('flex items-center gap-2 p-2 rounded border', t.border, t.surface, t.text)} data-testid={testId + '-proposal-' + i}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 text-sm">
                                        <SparklesIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="font-medium">{prop.key}</span>
                                        <span className="text-[var(--app-muted)]">{prop.operator}</span>
                                        <span>{prop.values.join(', ')}</span>
                                    </div>
                                    <div className="text-[11px] text-[var(--app-muted)]">
                                        Confidence: {Math.round(proposal.confidence * 100)}% · {prop.provenance}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="xs" variant="secondary" onClick={() => handleAccept(proposal)} data-testid={testId + '-accept-' + i}>
                                        <CheckIcon className="w-3 h-3" />
                                        Accept
                                    </Button>
                                    <Button size="xs" variant="ghost" onClick={() => handleReject(proposal)} data-testid={testId + '-reject-' + i}>
                                        <XMarkIcon className="w-3 h-3" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {acceptedProposals.length > 0 && (
                <div className="mt-2 space-y-1" data-testid={testId + '-accepted'}>
                    {acceptedProposals.map((proposal, i) => {
                        const prop = proposal.property;
                        const t = tone.success;
                        return (
                            <div key={i} className={cn('flex items-center gap-2 px-2 py-1 rounded border text-sm', t.border, t.surface, t.text)} data-testid={testId + '-accepted-' + i}>
                                <CheckIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="font-medium">{prop.key}</span>
                                <span className="text-[var(--app-muted)]">{prop.operator}</span>
                                <span>{prop.values.join(', ')}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {suggestStatus === 'loading' && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--app-text-secondary)]" data-testid={testId + '-suggest-status'}>
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                    <span>Thinking…</span>
                </div>
            )}

            {suggestStatus === 'error' && suggestError && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[var(--color-danger)]" data-testid={testId + '-error'}>
                    <AlertCircleIcon className="w-4 h-4" />
                    <span>{suggestError}</span>
                </div>
            )}

            {!readOnly && onSuggest && (
                <div className="mt-3 flex items-center gap-2">
                    <Button
                        size="sm"
                        variant={providerKind === 'remote' ? 'secondary' : 'outline'}
                        onClick={() => onSuggest(value)}
                        disabled={suggestStatus === 'loading'}
                        data-testid={testId + '-suggest'}
                    >
                        {suggestStatus === 'loading' ? (
                            <>
                                <Loader2Icon className="w-4 h-4 animate-spin" />
                                <span>Suggesting…</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                <span>Suggest Properties</span>
                            </>
                        )}
                    </Button>
                    {providerKind && (
                        <span className="text-[11px] text-[var(--app-muted)]">Provider: {providerKind}</span>
                    )}
                </div>
            )}
        </div>
    );
}
`;
  }

  generateTest(surface: UisgSurface, _graph: UisgGraph, target: TemplateTarget): string {
    if (target !== 'react') return this.generateNonReactTest(surface, target);

    const componentName = this.deriveComponentName(surface);
    const testId = this.deriveTestId(surface);
    const imports = this.getTestImports(surface, target);

    return `${this.generateHeader(surface)}
${imports.join('\n')}

const mockProposals = [
    {
        property: { key: 'skill', operator: 'eq', values: ['typescript'], role: 'constraint', confidence: 0.9, provenance: 'heuristic' },
        confidence: 0.9,
        status: 'pending' as const,
    },
    {
        property: { key: 'availability', operator: 'includes', values: ['weekends'], role: 'constraint', confidence: 0.8, provenance: 'local-model' },
        confidence: 0.8,
        status: 'pending' as const,
    },
];

describe('${componentName} (generated)', () => {
    it('renders editor with placeholder', () => {
        render(<${componentName} placeholder="Enter text…" />);
        expect(screen.getByTestId('${testId}')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter text…')).toBeInTheDocument();
    });

    it('shows suggestions when typing /', () => {
        render(<${componentName} ontology={[{ id: 'skill', label: 'Skill', type: 'string' }]} />);
        const textarea = screen.getByTestId('${testId}-input');
        fireEvent.change(textarea, { target: { value: '/' } });
        expect(screen.getByTestId('${testId}-suggestions')).toBeInTheDocument();
        expect(screen.getByText('Skill')).toBeInTheDocument();
    });

    it('accepts proposal and calls onAcceptProposal', () => {
        const onAccept = vi.fn();
        render(<${componentName} proposals={mockProposals} onAcceptProposal={onAccept} />);
        fireEvent.click(screen.getByTestId('${testId}-accept-0'));
        expect(onAccept).toHaveBeenCalledWith(mockProposals[0].property);
    });

    it('rejects proposal and calls onRejectProposal', () => {
        const onReject = vi.fn();
        render(<${componentName} proposals={mockProposals} onRejectProposal={onReject} />);
        fireEvent.click(screen.getByTestId('${testId}-reject-0'));
        expect(onReject).toHaveBeenCalledWith(mockProposals[0].property);
    });

    it('shows loading state during suggestion', () => {
        render(<${componentName} suggestStatus="loading" />);
        expect(screen.getByText('Thinking…')).toBeInTheDocument();
    });

    it('shows error message when suggestion fails', () => {
        render(<${componentName} suggestError="API error" />);
        expect(screen.getByTestId('${testId}-error')).toHaveTextContent('API error');
    });

    it('calls onSuggest when suggest button clicked', () => {
        const onSuggest = vi.fn();
        render(<${componentName} value="Some text" onSuggest={onSuggest} />);
        fireEvent.click(screen.getByTestId('${testId}-suggest'));
        expect(onSuggest).toHaveBeenCalledWith('Some text');
    });

    it('is read-only when readOnly prop is true', () => {
        render(<${componentName} readOnly value="Fixed" />);
        const textarea = screen.getByTestId('${testId}-input');
        expect(textarea).toHaveAttribute('readonly');
    });
});
`;
  }

  generatePropsSchema(surface: UisgSurface, _graph: UisgGraph): string {
    const schemaName = surface.id.replace(/[.-]/g, '_');
    const typeName = schemaName.replace(/-./g, (m: string) => m[1].toUpperCase());

    return `${this.generateHeader(surface)}
import { z } from 'zod';

export const ${schemaName}_PropsSchema = z.object({
    value: z.string().optional(),
    onChange: z.function().args(z.string()).returns(z.void()).optional(),
    placeholder: z.string().optional(),
    readOnly: z.boolean().optional(),
    autoFocus: z.boolean().optional(),
    ontology: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.string(),
        values: z.array(z.string()).optional(),
        unit: z.string().optional(),
    })).optional(),
    proposals: z.array(z.object({
        property: z.object({
            key: z.string(),
            operator: z.string(),
            values: z.array(z.string()),
            role: z.string(),
            confidence: z.number(),
            provenance: z.string(),
        }),
        confidence: z.number(),
        status: z.enum(['pending', 'accepted', 'rejected']),
    })).optional(),
    onAcceptProposal: z.function().args(z.object({
        key: z.string(),
        operator: z.string(),
        values: z.array(z.string()),
        role: z.string(),
        confidence: z.number(),
        provenance: z.string(),
    })).returns(z.void()).optional(),
    onRejectProposal: z.function().args(z.object({
        key: z.string(),
        operator: z.string(),
        values: z.array(z.string()),
        role: z.string(),
        confidence: z.number(),
        provenance: z.string(),
    })).returns(z.void()).optional(),
    onSuggest: z.function().args(z.string()).returns(z.void()).optional(),
    suggestStatus: z.enum(['idle', 'loading', 'error']).optional(),
    suggestError: z.string().nullable().optional(),
    providerKind: z.enum(['heuristic', 'local-model', 'remote']).optional(),
    className: z.string().optional(),
    testId: z.string().optional(),
});

export type ${typeName}Props = z.infer<typeof ${schemaName}_PropsSchema>;
`;
  }
})();