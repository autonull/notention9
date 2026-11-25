import type { UisgGraph, UisgSurface } from './types.js';
import type { ParamDef } from '@notention/core/ui/strategy.js';
import type { TemplateTarget } from './templates/render.js';
import { getTemplate, registerTemplate, type Template, type TemplateShape } from './templates/index.js';
import { renderTargetComponent, renderTargetTest } from './templates/render.js';

export type PrimitiveName =
    | 'Card'
    | 'Header'
    | 'Body'
    | 'BadgeRow'
    | 'Footer'
    | 'ActionBar'
    | 'Avatar'
    | 'Icon'
    | 'Text'
    | 'Score'
    | 'Direction'
    | 'Author'
    | 'Explanation'
    | 'Matches'
    | 'Conflicts'
    | 'Missing'
    | 'ExplanationToggle';

export interface PrimitiveProp {
    key: string;
    value: string | boolean | number | PrimitiveProp[] | { ref: string } | string[] | Record<string, unknown>;
}

export interface Primitive {
    type: PrimitiveName;
    props: PrimitiveProp[];
    children?: Composition[];
    slots?: Record<string, Composition[]>;
    render?: never;
}

export interface Composition {
    type: 'primitive' | 'sequence' | 'conditional' | 'slot';
    primitive?: Primitive;
    items?: Composition[];
    condition?: string;
    thenBranch?: Composition;
    elseBranch?: Composition;
    slotName?: string;
}

export interface ComposedTemplate {
    shape: TemplateShape;
    name: string;
    description: string;
    composition: Composition;
    propsSchema?: Record<string, ParamDef>;
}

function compileChildren(children: Composition[], target: TemplateTarget): string {
    return children.map(c => compileComposition(c, target)).join('\n');
}

const PRIMITIVE_REGISTRY: Record<PrimitiveName, PrimitiveDefinition> = {
    Card: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const className = props.className ? ` ${props.className}` : '';
            const testId = props.testId ? ` data-testid="${props.testId}"` : '';
            const onClick = props.onClick ? ` onClick={${props.onClick}}` : '';
            const open = `<Card${testId}${onClick} className="group relative flex flex-col gap-2 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-2.5 transition-colors hover:border-[var(--app-line-strong)]${className}">`;
            const close = '</Card>';
            return { open, close, children: compileChildren(children, target) };
        },
        propsSchema: {
            className: { type: 'string', optional: true },
            testId: { type: 'string', optional: true },
            onClick: { type: 'string', optional: true },
        },
    },
    Header: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const score = props.score ? `<span className="text-[12px] font-semibold tabular-nums text-[var(--app-text-secondary)]">{score}%</span>` : '';
            const label = props.label ? `<span className="text-[11px] text-[var(--app-faint)]">${props.label}</span>` : '';
            const direction = props.direction ? `{direction && <span className="text-[11px] text-[var(--app-faint)]">· {direction}</span>}` : '';
            const open = `<div className="flex items-center gap-2">${score}${label}${direction}`;
            const close = '</div>';
            return { open, close, children: compileChildren(children, target) };
        },
        propsSchema: {
            score: { type: 'boolean', optional: true },
            label: { type: 'string', optional: true },
            direction: { type: 'boolean', optional: true },
        },
    },
    Body: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const truncate = props.truncate ? ` className="line-clamp-${props.truncate}"` : '';
            const markup = props.markup ? ' dangerouslySetInnerHTML={{ __html: content }}' : '';
            const content = props.markup ? '{markup}' : '{content}';
            const open = `<div${truncate}${markup}>`;
            const close = '</div>';
            return { open, close, children: content };
        },
        propsSchema: {
            truncate: { type: 'number', optional: true },
            markup: { type: 'boolean', optional: true },
        },
    },
    BadgeRow: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const open = `<div className="flex flex-wrap gap-1.5">`;
            const close = '</div>';
            return { open, close, children: compileChildren(children, target) };
        },
        propsSchema: {},
    },
    Footer: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const actions = props.actions ? `actions={${JSON.stringify(props.actions)}}` : '';
            const explanation = props.explanation ? `explanation={${JSON.stringify(props.explanation)}}` : '';
            const open = `<div className="flex items-center gap-2 pt-1 border-t border-[var(--app-line)]">${actions}${explanation}`;
            const close = '</div>';
            return { open, close, children: compileChildren(children, target) };
        },
        propsSchema: {
            actions: { type: 'string[]', optional: true },
            explanation: { type: 'object', optional: true },
        },
    },
    ActionBar: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const actions = (props.actions as string[] ?? []);
            const buttons = actions.map((action: string) => {
                const variants: Record<string, string> = {
                    connect: 'onConnect',
                    chat: 'onChat',
                    respond: 'onRespond',
                    view: 'onView',
                };
                const handler = variants[action] || `on${action.charAt(0).toUpperCase() + action.slice(1)}`;
                const labels: Record<string, string> = {
                    connect: 'Connect',
                    chat: 'Chat',
                    respond: 'Respond',
                    view: 'View',
                };
                return `<Button variant="ghost" size="sm" onClick={${handler}}>{${labels[action] || action}}</Button>`;
            }).join('\n');
            return { open: `<div className="flex gap-1.5">${buttons}`, close: '</div>', children: '' };
        },
        propsSchema: {
            actions: { type: 'string[]', optional: true },
        },
    },
    Avatar: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: `<div className="w-8 h-8 rounded-full bg-[var(--app-accent)] flex items-center justify-center text-white text-xs font-semibold">{author?.charAt(0)}</div>`, close: '', children: '' };
        },
        propsSchema: {},
    },
    Icon: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const name = props.name || 'SparklesIcon';
            return { open: `<${name} className="h-3 w-3 shrink-0" />`, close: '', children: '' };
        },
        propsSchema: { name: { type: 'string', optional: true } },
    },
    Text: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const className = props.className ? ` className="${props.className}"` : '';
            const content = typeof props.content === 'string' ? props.content : '{content}';
            return { open: `<span${className}>`, close: '</span>', children: content };
        },
        propsSchema: { content: { type: 'string', optional: true }, className: { type: 'string', optional: true } },
    },
    Score: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '<span className="text-[12px] font-semibold tabular-nums text-[var(--app-text-secondary)]">{score}%</span>', close: '', children: '' };
        },
        propsSchema: {},
    },
    Direction: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '{direction && <span className="text-[11px] text-[var(--app-faint)]">· {direction}</span>}', close: '', children: '' };
        },
        propsSchema: {},
    },
    Author: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '{note.author && !isLocal && <span className="ml-auto flex max-w-[9rem] items-center gap-1 truncate font-mono text-[11px] text-[var(--app-faint)]"><NetworkIcon className="h-3 w-3 shrink-0" />{note.author}</span>}', close: '', children: '' };
        },
        propsSchema: {},
    },
    Explanation: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            const expandable = props.expandable ? 'true' : 'false';
            const defaultClosed = props.defaultClosed ? 'true' : 'false';
            return { open: `<ExplanationPanel expandable={${expandable}} defaultClosed=${defaultClosed} />`, close: '', children: '' };
        },
        propsSchema: { expandable: { type: 'boolean', optional: true }, defaultClosed: { type: 'boolean', optional: true } },
    },
    Matches: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '{result.matches.map((m, i) => <MatchBadge key={i} match={m} />)}', close: '', children: '' };
        },
        propsSchema: {},
    },
    Conflicts: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '{result.conflicts?.map((c, i) => <ConflictBadge key={i} conflict={c} />)}', close: '', children: '' };
        },
        propsSchema: {},
    },
    Missing: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '{result.missing?.map((m, i) => <MissingBadge key={i} missing={m} />)}', close: '', children: '' };
        },
        propsSchema: {},
    },
    ExplanationToggle: {
        render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget): { open: string; close: string; children: string } => {
            return { open: '<Button variant="ghost" size="sm" onClick={() => handleExplanationToggle(!explanationsOpen)}><ChevronDownIcon className={`h-4 w-4 transition-transform ${explanationsOpen ? "rotate-180" : ""}`} /></Button>', close: '', children: '' };
        },
        propsSchema: {},
    },
};

interface PrimitiveDefinition {
    render: (props: Record<string, unknown>, children: Composition[], target: TemplateTarget) => { open: string; close: string; children: string };
    propsSchema: Record<string, { type: string; optional?: boolean }>;
}

export function compose(composition: Composition): ComposedTemplate {
    return {
        shape: 'item',
        name: 'composed',
        description: 'Composed from primitives',
        composition,
    };
}

export function primitive(type: PrimitiveName, props: PrimitiveProp[] = [], children: Composition[] = []): Composition {
    return { type: 'primitive', primitive: { type, props, children } };
}

export function sequence(items: Composition[]): Composition {
    return { type: 'sequence', items };
}

export function conditional(condition: string, thenBranch: Composition, elseBranch?: Composition): Composition {
    return { type: 'conditional', condition, thenBranch, elseBranch };
}

export function slot(slotName: string, fallback: Composition[] = []): Composition {
    return { type: 'slot', slotName, items: fallback };
}

function compilePrimitive(primitive: Primitive, target: TemplateTarget): { open: string; close: string; children: string } {
    const def = PRIMITIVE_REGISTRY[primitive.type];
    if (!def) throw new Error(`Unknown primitive: ${primitive.type}`);
    const props: Record<string, unknown> = {};
    for (const prop of primitive.props) {
        if (prop.value && typeof prop.value === 'object' && 'ref' in prop.value) {
            props[prop.key] = (prop.value as { ref: string }).ref;
        } else {
            props[prop.key] = prop.value;
        }
    }
    return def.render(props, primitive.children ?? [], target);
}

function compileComposition(comp: Composition, target: TemplateTarget): string {
    switch (comp.type) {
        case 'primitive': {
            if (!comp.primitive) return '';
            const { open, close, children } = compilePrimitive(comp.primitive, target);
            return `${open}${children}${close}`;
        }
        case 'sequence': {
            return (comp.items ?? []).map(c => compileComposition(c, target)).join('\n');
        }
        case 'conditional': {
            const thenCode = comp.thenBranch ? compileComposition(comp.thenBranch, target) : '';
            const elseCode = comp.elseBranch ? compileComposition(comp.elseBranch, target) : '';
            return `{${comp.condition} ? (\n${thenCode}\n) : (\n${elseCode}\n)}`;
        }
        case 'slot': {
            return `{${comp.slotName} ? ${comp.slotName} : (\n${(comp.items ?? []).map(c => compileComposition(c, target)).join('\n')}\n)}`;
        }
    }
}

export function generateComposedComponent(
    surface: UisgSurface,
    graph: UisgGraph,
    target: TemplateTarget,
    composed: ComposedTemplate
): string {
    if (target !== 'react') {
        return renderTargetComponent(surface, composed.shape, target);
    }

    const componentName = surface.component ?? surface.id.replace('surface.', '').replace(/-./g, (m: string) => m[1].toUpperCase());
    const testId = componentName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    const body = compileComposition(composed.composition, target);

    return `// GENERATED by optimize/src/uisg/compose.ts
// DO NOT EDIT MANUALLY
// Template: composed (${composed.name})
// Source surface: ${surface.id}

import React, { useState } from 'react';
import { Card, Button } from '../ui/Primitives';
import {
    SparklesIcon, TagIcon, NetworkIcon, UserPlusIcon, ChatIcon, ClockIcon,
    CheckCircleIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon,
    ChevronDownIcon, XMarkIcon, ArrowRightIcon,
} from '../ui/icons';
import { formatPropertyRange, formatPropertyValue } from '../../utils/propertyDisplay';
import type { ScoredMatch, PropertyMatch, MatchDetails } from '@notention/core';

interface ${componentName}Props {
    match: ScoredMatch;
    isLocal: boolean;
    isContact?: boolean;
    onClick?: () => void;
    onConnect?: () => void;
    onChat?: () => void;
    onRespond?: () => void;
    onView?: () => void;
    onExplanation?: (action: 'explained' | 'dismissed') => void;
}

function getMatchTypeLabel(details?: MatchDetails): string {
    if (!details) return 'Matched';
    switch (details.type) {
        case 'exact': return 'Exact match';
        case 'alias': return 'Alias match';
        case 'fuzzy': return 'Fuzzy match';
        case 'range': return 'Range match';
        case 'partial': return 'Partial match';
        case 'geo': return 'Geographic match';
        case 'date': return 'Date match';
        default: return 'Matched';
    }
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
    const score = Math.round(result.score * 100);
    const [explanationsOpen, setExplanationsOpen] = useState(false);

    const handleExplanationToggle = (open: boolean) => {
        setExplanationsOpen(open);
        onExplanation?.(open ? 'explained' : 'dismissed');
    };

    return (
        ${body}
    );
}
`;
}

export function generateComposedTest(
    surface: UisgSurface,
    graph: UisgGraph,
    target: TemplateTarget,
    composed: ComposedTemplate
): string {
    return renderTargetTest(surface, composed.name, target);
}

export function generateComposedPropsSchema(
    surface: UisgSurface,
    graph: UisgGraph,
    composed: ComposedTemplate
): string {
    const componentName = surface.id.replace('surface.', '').replace(/-./g, (m: string) => m[1].toUpperCase());
    const schemaName = surface.id.replace(/[.-]/g, '_');

    return `// GENERATED by optimize/src/uisg/compose.ts
// DO NOT EDIT MANUALLY
// Template: composed (${composed.name})
// Source surface: ${surface.id}
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
                reason: z.string(),
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
export type ${schemaName.replace(/-./g, (m: string) => m[1].toUpperCase())}Props = z.infer<typeof ${schemaName}_PropsSchema>;
`;
}

export function registerComposedTemplate(composed: ComposedTemplate): void {
    const template: Template = {
        shape: composed.shape,
        name: composed.name,
        description: composed.description,
        generateComponent: (surface, graph, target) => generateComposedComponent(surface, graph, target, composed),
        generateTest: (surface, graph, target) => generateComposedTest(surface, graph, target, composed),
        generatePropsSchema: (surface, graph) => generateComposedPropsSchema(surface, graph, composed),
    };
    registerTemplate(template);
}

export const MatchItemComposition = compose(
    sequence([
        primitive('Card', [
            { key: 'testId', value: 'match-item' },
            { key: 'className', value: 'group' },
        ], [
            primitive('Header', [
                { key: 'score', value: true },
                { key: 'label', value: 'match' },
                { key: 'direction', value: true },
            ], []),
            primitive('Author', [], []),
            primitive('Body', [
                { key: 'truncate', value: 2 },
                { key: 'markup', value: true },
            ], []),
            primitive('BadgeRow', [], [
                primitive('Matches', [], []),
                primitive('Conflicts', [], []),
                primitive('Missing', [], []),
            ]),
            primitive('Footer', [
                { key: 'actions', value: ['respond', 'connect', 'chat'] },
                { key: 'explanation', value: { expandable: true, defaultClosed: true } },
            ], [
                primitive('ExplanationToggle', [], []),
            ]),
        ]),
    ])
);

export const DenseMatchItemComposition = compose(
    sequence([
        primitive('Card', [
            { key: 'testId', value: 'dense-match-item' },
            { key: 'className', value: 'group p-2' },
        ], [
            primitive('Header', [
                { key: 'score', value: true },
                { key: 'label', value: '' },
                { key: 'direction', value: false },
            ], []),
            primitive('Body', [
                { key: 'truncate', value: 1 },
                { key: 'markup', value: true },
            ], []),
            primitive('BadgeRow', [], [
                primitive('Matches', [], []),
            ]),
            primitive('Footer', [
                { key: 'actions', value: ['connect'] },
            ], []),
        ]),
    ])
);