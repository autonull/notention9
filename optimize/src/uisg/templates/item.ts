import type { UisgSurface, UisgGraph } from '../types.js';
import type { TemplateTarget } from './render.js';
import { BaseTemplate } from './base.js';

export const itemTemplate = new (class extends BaseTemplate {
  constructor() {
    super({
      shape: 'item',
      name: 'item',
      description: 'Card/list item with match details, explanation, and actions',
      defaultImports: [
        'import React, { useState } from \'react\';',
        'import { cn } from \'../../utils/ui\';',
        'import { Button } from \'../ui/Button\';',
        'import { tone } from \'../../styles/tone\';',
        'import { CheckCircleIcon, XCircleIcon, InfoIcon, ChevronDownIcon, ExternalLinkIcon, MessageSquareIcon, UserPlusIcon } from \'../ui/icons\';',
        'import type { Note, ScoredMatch, PropertyMatch, PropertyConflict, PropertyMissing } from \'@notention/core\';',
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
    match: {
        note: { id: string; title?: string; content?: string; author?: string };
        result: {
            score: number;
            matches: PropertyMatch[];
            conflicts?: PropertyConflict[];
            missing?: PropertyMissing[];
        };
        direction?: string;
    };
    isLocal: boolean;
    isContact?: boolean;
    onClick?: () => void;
    onConnect?: () => void;
    onChat?: () => void;
    onRespond?: () => void;
    onView?: () => void;
    onExplanation?: (action: 'explained' | 'dismissed') => void;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
    request: 'Request',
    offer: 'Offer',
    event: 'Event',
    note: 'Note',
};

const MATCH_TYPE_TONES: Record<string, keyof typeof tone> = {
    request: 'accent',
    offer: 'success',
    event: 'warning',
    note: 'neutral',
};

function formatExplanationReason(reason: string): string {
    return reason
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export function ${componentName}({
    match,
    isLocal,
    isContact = false,
    onClick,
    onConnect,
    onChat,
    onRespond,
    onView,
    onExplanation,
}: ${componentName}Props) {
    const { note, result, direction } = match;
    const matchType = direction ?? 'note';
    const matchTone = MATCH_TYPE_TONES[matchType] ?? 'neutral';
    const t = tone[matchTone];

    const [showExplanation, setShowExplanation] = useState(false);

    return (
        <article
            className={cn(
                'group relative rounded-lg border bg-[var(--app-surface)] p-4 transition-all',
                'hover:border-[var(--app-line-strong)] hover:shadow-lg',
                t.border,
                'data-[selected=true]:border-[var(--app-accent)] data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--app-accent)]',
                onClick && 'cursor-pointer'
            )}
            data-testid="${testId}"
            data-selected={!!onClick}
            onClick={onClick}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }} : undefined}
        >
            <div className="flex items-start gap-3">
                <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium', t.surface)}>
                    {note.title?.[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            {note.title && (
                                <h4 className="font-medium text-[var(--app-text)] truncate">{note.title}</h4>
                            )}
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--app-muted)]">
                                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', t.border, t.surface, t.text)}>
                                    {MATCH_TYPE_LABELS[matchType] ?? matchType}
                                </span>
                                {result.score !== undefined && (
                                    <span className="font-mono">Score: {Math.round(result.score * 100)}%</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {note.content && (
                        <p className="mt-2 line-clamp-2 text-sm text-[var(--app-text-secondary)]">{note.content}</p>
                    )}

                    <div className="mt-3 space-y-2">
                        {result.matches.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--app-text-secondary)]">
                                    <CheckCircleIcon className="w-3 h-3 text-[var(--color-success)]" />
                                    <span>Matches ({result.matches.length})</span>
                                </div>
                                <div className="ml-4 space-y-1">
                                    {result.matches.map((m, i) => (
                                        <div key={i} className="text-[12px] text-[var(--app-text-secondary)]">
                                            <span className="font-mono">{m.requestProp.key}</span>
                                            <span className="mx-1 opacity-50">{m.requestProp.operator}</span>
                                            <span>{m.requestProp.values.join(', ')}</span>
                                            {m.reason && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[var(--app-raised)]">
                                                    {formatExplanationReason(m.reason)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.conflicts && result.conflicts.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-danger)]">
                                    <XCircleIcon className="w-3 h-3" />
                                    <span>Conflicts ({result.conflicts.length})</span>
                                </div>
                                <div className="ml-4 space-y-1">
                                    {result.conflicts.map((c, i) => (
                                        <div key={i} className="text-[12px] text-[var(--color-danger)]">
                                            <span className="font-mono">{c.requestProp.key}</span>
                                            <span className="mx-1 opacity-50">{c.requestProp.operator}</span>
                                            <span>expected {c.requestProp.values.join(', ')}</span>
                                            <span className="ml-1">≠</span>
                                            <span>{c.offerProp.values.join(', ')}</span>
                                            {c.reason && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[var(--app-raised)]">
                                                    {formatExplanationReason(c.reason)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result.missing && result.missing.length > 0 && (
                            <div>
                                <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-warning)]">
                                    <InfoIcon className="w-3 h-3" />
                                    <span>Missing ({result.missing.length})</span>
                                </div>
                                <div className="ml-4 space-y-1">
                                    {result.missing.map((m, i) => (
                                        <div key={i} className="text-[12px] text-[var(--color-warning)]">
                                            <span className="font-mono">{m.key}</span>
                                            <span className="mx-1 opacity-50">{m.operator}</span>
                                            <span>{m.values.join(', ')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <button
                        type="button"
                        onClick={() => { setShowExplanation(!showExplanation); onExplanation?.(showExplanation ? 'dismissed' : 'explained'); }}
                        className={cn(
                            'p-1 rounded transition-colors hover:bg-[var(--app-raised)]',
                            showExplanation && 'bg-[var(--app-raised)]'
                        )}
                        data-testid="${testId}-explanation-toggle"
                        aria-expanded={showExplanation}
                        aria-controls="${testId}-explanation-details"
                        aria-label={showExplanation ? 'Hide explanation' : 'Show explanation'}
                    >
                        <ChevronDownIcon className={cn('w-4 h-4 text-[var(--app-muted)] transition-transform', showExplanation && 'rotate-180')} />
                    </button>

                    {showExplanation && (
                        <div id="${testId}-explanation-details" className="w-full mt-2 p-3 rounded bg-[var(--app-raised)] border border-[var(--app-line)] text-[11px] text-[var(--app-text-secondary)]">
                            <div className="font-medium text-[var(--app-text)] mb-1">How this match works</div>
                            <div className="space-y-1">
                                {result.matches.map((m, i) => (
                                    <div key={i}>
                                        <span className="font-mono">{m.requestProp.key}</span>
                                        <span className="mx-1">{m.requestProp.operator}</span>
                                        <span>{m.requestProp.values.join(', ')}</span>
                                        {' → '}
                                        <span className="font-medium">{m.offerProp.values.join(', ')}</span>
                                        {m.reason && <span className="ml-2 text-[var(--app-muted)]">({formatExplanationReason(m.reason)})</span>}
                                    </div>
                                ))}
                                {result.conflicts?.map((c, i) => (
                                    <div key={i} className="text-[var(--color-danger)]">
                                        CONFLICT: <span className="font-mono">{c.requestProp.key}</span> expected {c.requestProp.values.join(', ')} but got {c.offerProp.values.join(', ')}
                                    </div>
                                ))}
                                {result.missing?.map((m, i) => (
                                    <div key={i} className="text-[var(--color-warning)]">
                                        MISSING: <span className="font-mono">{m.key}</span> {m.operator} {m.values.join(', ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--app-line)]">
                {!isLocal && !isContact && onConnect && (
                    <Button size="sm" variant="primary" onClick={onConnect} data-testid="${testId}-connect-button">
                        <UserPlusIcon className="w-3 h-3" />
                        Connect
                    </Button>
                )}
                {!isLocal && isContact && onChat && (
                    <Button size="sm" variant="secondary" onClick={onChat} data-testid="${testId}-chat-button">
                        <MessageSquareIcon className="w-3 h-3" />
                        Chat
                    </Button>
                )}
                {isLocal && onRespond && (
                    <Button size="sm" variant="primary" onClick={onRespond} data-testid="${testId}-respond-button">
                        Respond
                    </Button>
                )}
                {onView && (
                    <Button size="sm" variant="ghost" onClick={onView} data-testid="${testId}-view-button">
                        <ExternalLinkIcon className="w-3 h-3" />
                        View
                    </Button>
                )}
            </div>
        </article>
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

const mockMatch = {
    note: { id: 'test-1', title: 'Test Note', content: 'Test content', author: 'author-1' },
    result: {
        score: 0.85,
        matches: [
            { requestProp: { key: 'skill', operator: 'eq', values: ['typescript'] }, offerProp: { key: 'skill', operator: 'eq', values: ['typescript'] }, reason: 'exact_match' },
            { requestProp: { key: 'availability', operator: 'includes', values: ['weekends'] }, offerProp: { key: 'schedule', operator: 'includes', values: ['weekends'] }, reason: 'cross_key_match' },
        ],
        conflicts: [
            { requestProp: { key: 'price', operator: 'lte', values: ['50'] }, offerProp: { key: 'rate', operator: 'eq', values: ['75'] }, reason: 'value_mismatch' },
        ],
        missing: [
            { key: 'certification', operator: 'eq', values: ['aws'] },
        ],
    },
    direction: 'request',
};

describe('${componentName} (generated)', () => {
    it('renders match card with title and score', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        expect(screen.getByTestId('${testId}')).toBeInTheDocument();
        expect(screen.getByText('Test Note')).toBeInTheDocument();
        expect(screen.getByText('Score: 85%')).toBeInTheDocument();
    });

    it('shows match type badge', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        expect(screen.getByText('Request')).toBeInTheDocument();
    });

    it('shows matches with reasons', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        expect(screen.getByText('exact_match')).toBeInTheDocument();
        expect(screen.getByText('cross_key_match')).toBeInTheDocument();
    });

    it('shows conflicts', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        expect(screen.getByText('value_mismatch')).toBeInTheDocument();
        expect(screen.getByText('expected 50')).toBeInTheDocument();
    });

    it('shows missing properties', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        expect(screen.getByText('MISSING')).toBeInTheDocument();
        expect(screen.getByText('certification')).toBeInTheDocument();
    });

    it('shows Connect button for non-local non-contact match', () => {
        render(<${componentName} match={mockMatch} isLocal={false} isContact={false} />);
        expect(screen.getByTestId('${testId}-connect-button')).toBeInTheDocument();
    });

    it('shows Respond button for local match', () => {
        render(<${componentName} match={mockMatch} isLocal={true} />);
        expect(screen.getByTestId('${testId}-respond-button')).toBeInTheDocument();
    });

    it('toggles explanation details on button click', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        const toggleButton = screen.getByTestId('${testId}-explanation-toggle');
        expect(screen.queryByTestId('${testId}-explanation-details')).not.toBeInTheDocument();
        fireEvent.click(toggleButton);
        expect(screen.getByTestId('${testId}-explanation-details')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
        render(<${componentName} match={mockMatch} isLocal={false} />);
        const toggleButton = screen.getByTestId('${testId}-explanation-toggle');
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(toggleButton);
        expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
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
    match: z.object({
        note: z.object({
            id: z.string(),
            title: z.string().optional(),
            content: z.string().optional(),
            author: z.string().optional(),
        }),
        result: z.object({
            score: z.number(),
            matches: z.array(z.object({
                requestProp: z.object({
                    key: z.string(),
                    operator: z.string(),
                    values: z.array(z.string()),
                }),
                offerProp: z.object({
                    key: z.string(),
                    operator: z.string(),
                    values: z.array(z.string()),
                }),
                reason: z.string().optional(),
                details: z.object({
                    type: z.string(),
                    valueMatch: z.string().optional(),
                }).optional(),
            })),
            conflicts: z.array(z.object({
                reason: z.string(),
                requestProp: z.object({
                    key: z.string(),
                    operator: z.string(),
                    values: z.array(z.string()),
                }),
                offerProp: z.object({
                    key: z.string(),
                    operator: z.string(),
                    values: z.array(z.string()),
                }),
            })).optional(),
            missing: z.array(z.object({
                key: z.string(),
                operator: z.string(),
                values: z.array(z.string()),
            })).optional(),
        }),
        direction: z.string().optional(),
    }),
    isLocal: z.boolean(),
    isContact: z.boolean().optional(),
    onClick: z.function().optional(),
    onConnect: z.function().optional(),
    onChat: z.function().optional(),
    onRespond: z.function().optional(),
    onView: z.function().optional(),
    onExplanation: z.function().args(z.union([z.literal('explained'), z.literal('dismissed')])).returns(z.void()).optional(),
});

export type ${typeName}Props = z.infer<typeof ${schemaName}_PropsSchema>;
`;
  }
})();