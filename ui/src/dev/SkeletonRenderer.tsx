import React, {useLayoutEffect, useMemo, useState} from 'react';
import type {UisgSkeleton} from '@notention/optimize/uisg';
import {Badge} from '../components/ui/Badge';
import {Button} from '../components/ui/Button';
import {ConfirmationModal} from '../components/ui/ConfirmationModal';

declare global {
    interface Window {
        __UISG_SKELETON__?: { state: () => unknown };
    }
}

const query = () => new URLSearchParams(window.location.search);

export function SkeletonRenderer({skeleton}: { skeleton: UisgSkeleton }) {
    const [active, setActive] = useState<Record<string, boolean>>({});
    const [firedEffects, setFiredEffects] = useState<string[]>([]);
    const [pendingEffect, setPendingEffect] = useState<{ id: string; name: string } | null>(null);

    const flowId = query().get('flow');
    const flows = flowId ? skeleton.flows.filter(flow => flow.id === flowId) : skeleton.flows;

    const state = useMemo(() => ({
        graphHash: skeleton.graphHash,
        flow: flowId,
        guards: flows.flatMap(flow => flow.guards).map(guard => ({ id: guard.id, active: !!active[guard.id] })),
        firedEffects,
        lastEffect: firedEffects.at(-1) ?? null,
    }), [skeleton.graphHash, flowId, flows, active, firedEffects]);

    useLayoutEffect(() => {
        window.__UISG_SKELETON__ = { state: () => state };
    }, [state]);

    const fire = (effectId: string) => {
        setFiredEffects(effects => effects.includes(effectId) ? effects : [...effects, effectId]);
        setPendingEffect(null);
    };

    return (
        <div className="min-h-screen bg-[var(--app-bg)] px-6 py-8 text-[var(--app-text)]" data-testid="skeleton-root" data-skeleton-ready>
            <header className="mx-auto mb-8 max-w-5xl">
                <h1 className="text-2xl font-semibold">UI/UX space skeleton</h1>
                <p className="mt-1 text-sm text-[var(--app-text-secondary)]">
                    Generated from the graph · {skeleton.flows.length} flows · {skeleton.graphHash}
                </p>
            </header>
            <main className="mx-auto max-w-5xl space-y-8">
                {flows.map(flow => (
                    <section key={flow.id} className="space-y-4 rounded-xl border border-[var(--app-border)] p-5" data-testid={`skeleton-flow-${flow.id}`}>
                        <header className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold">{flow.name}</h2>
                            <Badge variant="secondary" size="xs">{flow.status}</Badge>
                            {flow.route && <Badge variant="outline" size="xs">{flow.route}</Badge>}
                        </header>
                        <p className="text-sm text-[var(--app-text-secondary)]">{flow.intent}</p>
                        {flow.guards.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                {flow.guards.map(guard => (
                                    <button
                                        key={guard.id}
                                        type="button"
                                        role="switch"
                                        aria-checked={!!active[guard.id]}
                                        data-testid={`skeleton-guard-${guard.id}`}
                                        onClick={() => setActive(value => ({...value, [guard.id]: !value[guard.id]}))}
                                        className="rounded-full border border-[var(--app-border)] px-3 py-1 text-xs"
                                    >
                                        Guard {guard.id} · {guard.expression} · {active[guard.id] ? 'open' : 'blocked'}
                                    </button>
                                ))}
                            </div>
                        )}
                        {flow.effects.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {flow.effects.map(effect => (
                                    <span key={effect.id} data-testid={`skeleton-effect-${effect.id}`}>
                                        <Badge variant={effect.risk === 'consequential' ? 'warning' : 'secondary'} size="xs">
                                            {effect.name} · {effect.risk}
                                        </Badge>
                                    </span>
                                ))}
                            </div>
                        )}
                        <ol className="space-y-3">
                            {flow.steps.map((step, index) => {
                                const blocked = step.guardIds.some(id => !active[id]);
                                const effect = step.effects[0];
                                return (
                                    <li key={step.id} className="rounded-lg bg-[var(--app-surface)] p-3" data-testid={`skeleton-step-${step.id}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-[var(--app-text-muted)]">{index + 1}</span>
                                            <span className="text-sm font-medium">{step.name}</span>
                                            <Badge variant="outline" size="xs">{step.kind}</Badge>
                                            {step.guardIds.map(id => (
                                                <Badge key={id} variant={active[id] ? 'success' : 'warning'} size="xs">
                                                    {id}
                                                </Badge>
                                            ))}
                                            {step.effects.map(item => (
                                                <span key={item.id} data-testid={`skeleton-step-effect-${step.id}-${item.id}`}>
                                                    <Badge variant={item.risk === 'consequential' ? 'warning' : 'secondary'} size="xs">
                                                        {item.name} · {item.risk}
                                                    </Badge>
                                                </span>
                                            ))}
                                        </div>
                                        {step.action && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Button
                                                    size="xs"
                                                    variant={effect?.risk === 'destructive' || effect?.risk === 'consequential' ? 'danger' : 'secondary'}
                                                    disabled={blocked}
                                                    data-testid={`skeleton-run-${step.id}`}
                                                    onClick={() => effect && (effect.confirmationRequired ? setPendingEffect(effect) : fire(effect.id))}
                                                >
                                                    {step.action} {step.name}
                                                </Button>
                                                {effect?.confirmationRequired && (
                                                    <span className="text-xs text-[var(--app-text-muted)]">requires confirmation</span>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                ))}
            </main>
            <ConfirmationModal
                isOpen={!!pendingEffect}
                onClose={() => setPendingEffect(null)}
                onConfirm={() => pendingEffect && fire(pendingEffect.id)}
                title={pendingEffect?.name ?? 'Confirm effect'}
                message={`Effect ${pendingEffect?.id ?? ''} is consequential and needs confirmation.`}
                isDestructive
            />
        </div>
    );
}