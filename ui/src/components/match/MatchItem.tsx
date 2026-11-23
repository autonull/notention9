import React from 'react';
import { ScoredMatch, PropertyMatch } from '@notention/core';
import {
    SparklesIcon,
    TagIcon,
    NetworkIcon,
    UserPlusIcon,
    ChatIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    QuestionMarkCircleIcon,
    ArrowRightIcon
} from '../ui/icons';
import {Button} from '../ui/Button';
import {formatPropertyRange, formatPropertyValue} from '../../utils/propertyDisplay';

interface MatchItemProps {
    match: ScoredMatch;
    isLocal: boolean;
    isContact?: boolean;
    onClick?: () => void;
    onConnect?: () => void;
    onChat?: () => void;
    onRespond?: () => void;
}

export function MatchItem({
    match,
    isLocal,
    isContact = false,
    onClick,
    onConnect,
    onChat,
    onRespond
}: MatchItemProps) {
    const { note, result, direction } = match;
    const score = Math.round(result.score * 100);

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex flex-col gap-2 rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] p-2.5 transition-colors
                hover:border-[var(--app-line-strong)]
                ${isLocal ? 'cursor-pointer' : ''}
            `}
            data-testid="match-item"
        >
            <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold tabular-nums text-[var(--app-text-secondary)]">
                    {score}%
                </span>
                <span className="text-[11px] text-[var(--app-faint)]">match</span>
                {direction && (
                    <span
                        className="text-[11px] text-[var(--app-faint)]"
                        title={direction === 'outgoing' ? 'Your note matches this one' : 'This note matches yours'}
                    >
                        · {direction}
                    </span>
                )}
                {note.author && !isLocal && (
                    <span className="ml-auto flex max-w-[9rem] items-center gap-1 truncate font-mono text-[11px] text-[var(--app-faint)]">
                        <NetworkIcon className="h-3 w-3 shrink-0" />
                        {note.author.slice(0, 8)}…
                    </span>
                )}
            </div>

            <div className="min-w-0">
                <p className="line-clamp-2 text-[12px] font-medium leading-4 text-[var(--app-text-secondary)]">
                    {note.title || note.content}
                </p>
            </div>

            <div className="flex flex-wrap gap-1">
                {result.matches.map((m, i) => (
                    <MatchBadge key={`match-${i}`} match={m} />
                ))}

                {result.conflicts?.map((m, i) => (
                    <span
                        key={`conflict-${i}`}
                        className="inline-flex items-center gap-1 rounded border border-[var(--app-line)] bg-[var(--app-raised)] px-1.5 py-0.5 text-[11px] text-[var(--app-muted)]"
                        title={m.reason}
                    >
                        <XMarkIcon className="h-2.5 w-2.5 text-red-400/80" />
                        {m.reason}
                    </span>
                ))}

                {result.missing?.map((p, i) => (
                    <span
                        key={`missing-${i}`}
                        className="inline-flex items-center gap-1 rounded border border-dashed border-[var(--app-line-strong)] px-1.5 py-0.5 text-[11px] text-[var(--app-faint)]"
                        title={`Missing property: ${p.key}`}
                    >
                        <QuestionMarkCircleIcon className="h-2.5 w-2.5" />
                        Missing: {p.key}
                    </span>
                ))}
            </div>

            <div className="flex gap-1.5">
                {isLocal ? (
                    <Button
                        size="xs"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onRespond?.(); }}
                        icon={ArrowRightIcon}
                        data-testid="match-respond-button"
                    >
                        Respond
                    </Button>
                ) : isContact ? (
                    <Button
                        size="xs"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onChat?.(); }}
                        icon={ChatIcon}
                    >
                        Chat
                    </Button>
                ) : (
                    <Button
                        size="xs"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                        icon={UserPlusIcon}
                    >
                        Connect
                    </Button>
                )}
            </div>
        </div>
    );
}

const MatchBadge: React.FC<{ match: PropertyMatch }> = ({ match }) => {
    const type = match.details?.type || 'unknown';
    const details = match.details;
    const key = match.requestProp.key;
    const offerValue = formatPropertyValue(match.offerProp.values[0] ?? '');
    const requestRange = formatPropertyRange(match.requestProp.values);
    let icon: React.ReactNode = null;
    let text = match.reason;

    switch (type) {
        case 'alias':
            icon = <TagIcon className="h-2.5 w-2.5" />;
            text = `${key} ≈ ${offerValue}`;
            break;
        case 'fuzzy':
            icon = <SparklesIcon className="h-2.5 w-2.5" />;
            text = `${key} ≈ ${offerValue}`;
            break;
        case 'range':
            text = `${key} ${details?.valueMatch === 'out' ? 'outside' : 'within'} ${requestRange}`;
            break;
        case 'date':
            icon = <ClockIcon className="h-2.5 w-2.5" />;
            text = `${key} ${offerValue}`;
            break;
        case 'partial':
            icon = <ExclamationTriangleIcon className="h-2.5 w-2.5" />;
            text = match.requestProp.operator === 'contains'
                ? `${key} contains ${offerValue}`
                : match.requestProp.operator === 'excludes'
                    ? `${key} excludes ${offerValue}`
                    : `${key}: ${offerValue}`;
            break;
        case 'substring':
            icon = <ExclamationTriangleIcon className="h-2.5 w-2.5" />;
            text = match.requestProp.operator === 'contains'
                ? `${key} contains ${offerValue}`
                : `${key}: ${offerValue}`;
            break;
        case 'exact':
            icon = <CheckCircleIcon className="h-2.5 w-2.5" />;
            text = `${key}: ${offerValue}`;
            break;
    }

    return (
        <span
            className="inline-flex items-center gap-1 rounded border border-[var(--app-line)] bg-[var(--app-raised)] px-1.5 py-0.5 text-[11px] text-[var(--app-muted)]"
            title={match.reason}
        >
            {icon}
            <span className="truncate">{text}</span>
        </span>
    );
};
