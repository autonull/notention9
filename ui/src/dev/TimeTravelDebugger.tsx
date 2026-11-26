// ui/src/dev/TimeTravelDebugger.tsx - Time-Travel Debugger for UISG Flows
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

interface FlowStep {
    index: number;
    id: string;
    kind: string;
    target?: any;
    action?: string;
    value?: string;
    guard?: string;
    statePath?: string;
    stateEquals?: any;
    guards: Array<{ id: string; satisfied: boolean }>;
    effects: Array<{ id: string; risk: string; confirmationRequired: boolean }>;
    timestamp: number;
}

interface FlowState {
    flowId: string;
    steps: FlowStep[];
    currentStep: number;
    state: Record<string, any>;
    isPlaying: boolean;
    speed: number;
}

interface DebugData {
    flowId: string;
    journey: string;
    trace: Array<{
        stepIndex: number;
        stepId: string;
        kind: string;
        stateBefore: Record<string, any>;
        stateAfter: Record<string, any>;
        guards: Array<{ id: string; satisfied: boolean }>;
        effects: Array<{ id: string; risk: string; confirmationRequired: boolean; fired: boolean }>;
        timestamp: number;
    }>;
}

const MOCK_FLOWS = ['flow.golden-path', 'flow.publish-gate', 'flow.capture-and-edit', 'flow.ontology-conflict'];

export function TimeTravelDebugger(): JSX.Element {
    const [searchParams] = useSearchParams();
    const [flowId, setFlowId] = useState(searchParams.get('flow') ?? 'flow.golden-path');
    const [debugData, setDebugData] = useState<DebugData | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [state, setState] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const playIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        setFlowId(searchParams.get('flow') ?? 'flow.golden-path');
    }, [searchParams.get('flow')]);

    useEffect(() => {
        async function loadDebugData() {
            try {
                setLoading(true);
                // In a real implementation, this would fetch from a trace endpoint
                // For now, generate mock data
                const mockData = generateMockDebugData(flowId);
                setDebugData(mockData);
                setCurrentStep(0);
                setState(mockData.trace[0]?.stateBefore ?? {});
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load debug data');
            } finally {
                setLoading(false);
            }
        }
        loadDebugData();
    }, [flowId]);

    useEffect(() => {
        if (!debugData) return;
        const trace = debugData.trace[currentStep];
        if (trace) {
            setState(trace.stateAfter);
        }
    }, [currentStep, debugData]);

    useEffect(() => {
        if (isPlaying && debugData) {
            playIntervalRef.current = window.setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= (debugData?.trace.length ?? 0) - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000 / speed);
        } else {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
                playIntervalRef.current = null;
            }
        }
        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
        };
    }, [isPlaying, speed, debugData]);

    function handleStepChange(step: number) {
        setCurrentStep(step);
    }

    function handlePlayPause() {
        if (currentStep >= (debugData?.trace.length ?? 0) - 1) {
            setCurrentStep(0);
        }
        setIsPlaying(!isPlaying);
    }

    function handleReset() {
        setCurrentStep(0);
        setIsPlaying(false);
    }

    function handleJumpToStep(step: number) {
        setCurrentStep(step);
    }

    function exportTrace() {
        if (!debugData) return;
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${flowId}-trace-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    const trace = debugData?.trace ?? [];
    const currentTrace = trace[currentStep];

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <div style={styles.toolbarLeft}>
                    <h2 style={styles.title}>Time-Travel Debugger</h2>
                    <div style={styles.flowSelect}>
                        <label>Flow:</label>
                        <select value={flowId} onChange={e => setFlowId(e.target.value)} style={styles.select}>
                            {MOCK_FLOWS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                </div>
                <div style={styles.toolbarRight}>
                    <div style={styles.controls}>
                        <button onClick={handleReset} style={styles.btn} disabled={currentStep === 0}>⏮ Reset</button>
                        <button onClick={handlePlayPause} style={styles.btnPrimary}>
                            {isPlaying ? '⏸ Pause' : '▶ Play'}
                        </button>
                        <div style={styles.speedControl}>
                            <label>Speed: {speed}x</label>
                            <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.5"
                                value={speed}
                                onChange={e => setSpeed(parseFloat(e.target.value))}
                                style={styles.slider}
                            />
                        </div>
                        <button onClick={exportTrace} style={styles.btnSecondary}>📥 Export Trace</button>
                    </div>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {loading && <div style={styles.loading}>Loading trace data...</div>}

            {!loading && !error && debugData && (
                <div style={styles.main}>
                    <div style={styles.timelinePanel}>
                        <div style={styles.panelHeader}>
                            <h3>Step Timeline ({trace.length} steps)</h3>
                        </div>
                        <div style={styles.sliderContainer}>
                            <input
                                type="range"
                                min="0"
                                max={trace.length - 1}
                                value={currentStep}
                                onChange={e => handleStepChange(parseInt(e.target.value))}
                                style={styles.mainSlider}
                            />
                            <div style={styles.stepLabels}>
                                {trace.map((t, i) => (
                                    <div
                                        key={t.stepId}
                                        style={{
                                            ...styles.stepLabel,
                                            ...(i === currentStep ? styles.stepLabelActive : {}),
                                        }}
                                        onClick={() => handleJumpToStep(i)}
                                    >
                                        {i}: {t.kind}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={styles.detailPanel}>
                        <div style={styles.panelHeader}>
                            <h3>Step {currentStep}: {currentTrace?.kind ?? 'N/A'}</h3>
                        </div>
                        <div style={styles.detailContent}>
                            <div style={styles.detailSection}>
                                <h4>Step Info</h4>
                                {currentTrace && (
                                    <>
                                        <div style={styles.field}><strong>Step ID:</strong> {currentTrace.stepId}</div>
                                        <div style={styles.field}><strong>Kind:</strong> {currentTrace.kind}</div>
                                        <div style={styles.field}><strong>Timestamp:</strong> {new Date(currentTrace.timestamp).toISOString()}</div>
                                    </>
                                )}
                            </div>

                            <div style={styles.detailSection}>
                                <h4>Guards</h4>
                                {currentTrace && currentTrace.guards.length > 0 ? (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr><th>Guard ID</th><th>Status</th></tr>
                                        </thead>
                                        <tbody>
                                            {currentTrace.guards.map(g => (
                                                <tr key={g.id} style={{ backgroundColor: g.satisfied ? '#dcfce7' : '#fef2f2' }}>
                                                    <td>{g.id}</td>
                                                    <td><span style={{ ...styles.badge, backgroundColor: g.satisfied ? '#22c55e' : '#ef4444' }}>{g.satisfied ? 'Satisfied' : 'Blocked'}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p style={styles.muted}>No guards</p>
                                )}
                            </div>

                            <div style={styles.detailSection}>
                                <h4>Effects</h4>
                                {currentTrace && currentTrace.effects.length > 0 ? (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr><th>Effect ID</th><th>Risk</th><th>Confirmation Required</th><th>Fired</th></tr>
                                        </thead>
                                        <tbody>
                                            {currentTrace.effects.map(e => (
                                                <tr key={e.id}>
                                                    <td>{e.id}</td>
                                                    <td><span style={{ ...styles.badge, backgroundColor: riskColor(e.risk) }}>{e.risk}</span></td>
                                                    <td>{e.confirmationRequired ? 'Yes' : 'No'}</td>
                                                    <td><span style={{ ...styles.badge, backgroundColor: e.fired ? '#22c55e' : '#999' }}>{e.fired ? 'Fired' : 'Pending'}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p style={styles.muted}>No effects</p>
                                )}
                            </div>

                            <div style={styles.detailSection}>
                                <h4>State Diff</h4>
                                {currentTrace && (
                                    <pre style={styles.stateDiff}>
                                        {JSON.stringify(diffObjects(currentTrace.stateBefore, currentTrace.stateAfter), null, 2)}
                                    </pre>
                                )}
                            </div>

                            <div style={styles.detailSection}>
                                <h4>Current State</h4>
                                <pre style={styles.stateDiff}>
                                    {JSON.stringify(state, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function generateMockDebugData(flowId: string): DebugData {
    const steps = ['show', 'action', 'choice', 'confirm', 'result', 'action', 'show', 'result'];
    const trace = steps.map((kind, i) => ({
        stepIndex: i,
        stepId: `step.${flowId.split('.')[1]}.${kind}${i > 0 ? i : ''}`,
        kind,
        stateBefore: { step: i, ...(i > 0 ? { previousStep: steps[i - 1] } : {}) },
        stateAfter: { step: i + 1, completed: kind, ...(kind === 'confirm' ? { confirmed: true } : {}) },
        guards: i > 0 ? [
            { id: `guard.${i}`, satisfied: Math.random() > 0.3 },
            { id: `guard.${i}.b`, satisfied: Math.random() > 0.5 },
        ] : [],
        effects: kind === 'action' ? [
            { id: `effect.${i}`, risk: 'normal', confirmationRequired: false, fired: true },
        ] : [],
        timestamp: Date.now() + i * 1000,
    }));

    return {
        flowId,
        journey: flowId.replace('flow.', ''),
        trace,
    };
}

function diffObjects(before: any, after: any): any {
    const result: any = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            result[key] = { before: before[key], after: after[key] };
        }
    }
    return result;
}

function riskColor(risk: string): string {
    const colors: Record<string, string> = {
        normal: '#22c55e',
        caution: '#f59e0b',
        destructive: '#ef4444',
        consequential: '#8b5cf6',
    };
    return colors[risk] ?? '#999';
}

const styles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#fafafa', fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: '#fff', borderBottom: '1px solid #e5e5e5' },
    toolbarLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    toolbarRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 600 },
    flowSelect: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    select: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', background: '#fff' },
    controls: { display: 'flex', alignItems: 'center', gap: '1rem' },
    btn: { padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' },
    btnPrimary: { padding: '0.5rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 },
    btnSecondary: { padding: '0.5rem 1rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
    speedControl: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' },
    slider: { width: '100px' },
    error: { padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecaca' },
    loading: { padding: '2rem', textAlign: 'center', color: '#6b7280' },
    main: { display: 'flex', flex: 1, overflow: 'hidden', gap: '1rem', padding: '1rem' },
    timelinePanel: { width: '300px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' },
    panelHeader: { padding: '0.75rem 1rem', borderBottom: '1px solid #e5e5e5' },
    sliderContainer: { flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' },
    mainSlider: { width: '100%', marginBottom: '1rem' },
    stepLabels: { display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '300px', overflow: 'auto' },
    stepLabel: { padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', background: '#f9fafb', border: '1px solid #e5e5e5' },
    stepLabelActive: { background: '#eef2ff', borderColor: '#6366f1', fontWeight: 500 },
    detailPanel: { flex: 1, minWidth: 0, background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' },
    detailContent: { flex: 1, padding: '1rem', overflow: 'auto' },
    detailSection: { marginBottom: '1.5rem' },
    field: { marginBottom: '0.5rem', fontSize: '0.875rem' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
    badge: { padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 500, color: '#fff' },
    muted: { color: '#6b7280', fontStyle: 'italic', padding: '1rem' },
    stateDiff: { padding: '1rem', background: '#1e1e1e', color: '#d4d4d4', borderRadius: '6px', fontSize: '0.75rem', maxHeight: '200px', overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
};

export default TimeTravelDebugger;