// ui/src/dev/GraphEditor.tsx - Visual UISG Graph Editor (lazy-loaded)
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface GraphNode {
    id: string;
    name: string;
    type: string;
    status: string;
    summary?: string;
    component?: string;
    route?: string;
    template?: string;
    variants?: Record<string, any>;
    defaultVariant?: string;
}

interface GraphEdge {
    from: string;
    type: string;
    to: string;
    when?: string;
}

interface GraphData {
    version: number;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

interface EditorState {
    nodes: Array<{ id: string; label: string; x: number; y: number; type: string; status: string; data: GraphNode }>;
    edges: Array<{ id: string; from: string; to: string; label: string; data: GraphEdge }>;
    selectedNode: string | null;
    previewSurface: string | null;
    mode: 'edit' | 'preview';
}

export function GraphEditor(): JSX.Element {
    const [searchParams] = useSearchParams();
    const [graph, setGraph] = useState<GraphData | null>(null);
    const [editorState, setEditorState] = useState<EditorState>({
        nodes: [],
        edges: [],
        selectedNode: null,
        previewSurface: null,
        mode: 'edit',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<any>(null);

    useEffect(() => {
        async function loadGraph() {
            try {
                const res = await fetch('/doc/uisg/graph.json');
                if (!res.ok) throw new Error('Failed to load graph');
                const data = await res.json();
                setGraph(data);
                initializeEditor(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }
        loadGraph();
    }, []);

    function initializeEditor(data: GraphData) {
        const surfaceNodes = data.nodes.filter(n => n.type === 'surface');
        const flowNodes = data.nodes.filter(n => n.type === 'flow');
        const otherNodes = data.nodes.filter(n => !['surface', 'flow'].includes(n.type));

        const nodes = [...surfaceNodes, ...flowNodes, ...otherNodes].map((node, i) => ({
            id: node.id,
            label: `${node.name} (${node.id})`,
            x: 100 + (i % 8) * 200,
            y: 100 + Math.floor(i / 8) * 150,
            type: node.type,
            status: node.status,
            data: node,
        }));

        const edges = data.edges.map((edge, i) => ({
            id: `edge-${i}`,
            from: edge.from,
            to: edge.to,
            label: edge.type,
            data: edge,
        }));

        setEditorState({
            nodes,
            edges,
            selectedNode: nodes[0]?.id ?? null,
            previewSurface: surfaceNodes[0]?.id ?? null,
            mode: 'edit',
        });
    }

    function handleNodeSelect(nodeId: string) {
        const node = editorState.nodes.find(n => n.id === nodeId);
        if (!node) return;

        setEditorState(prev => ({ ...prev, selectedNode: nodeId }));

        if (node.data.type === 'surface') {
            setEditorState(prev => ({ ...prev, previewSurface: nodeId }));
        }
    }

    function handleVariantChange(surfaceId: string, variantId: string) {
        if (!graph) return;
        const nodeIdx = graph.nodes.findIndex(n => n.id === surfaceId);
        if (nodeIdx === -1) return;

        const newGraph = { ...graph };
        newGraph.nodes[nodeIdx] = { ...newGraph.nodes[nodeIdx], defaultVariant: variantId };

        // In a real implementation, this would PATCH the graph.json
        console.log('Variant change:', surfaceId, variantId);
        alert(`Variant changed to ${variantId}. In production, this would persist to graph.json.`);
    }

    function handlePromoteVariant(surfaceId: string, variantId: string) {
        alert(`Promoting ${variantId} for ${surfaceId}. Would call uisg variants promote.`);
    }

    function renderNodeInfo(node: EditorState['nodes'][0]) {
        if (!node) return null;

        const { data } = node;
        const isSurface = data.type === 'surface';
        const variants = data.variants ?? {};
        const currentVariant = data.defaultVariant;

        return (
            <div style={styles.panel}>
                <h3 style={styles.panelTitle}>{data.name}</h3>
                <div style={styles.field}>
                    <strong>ID:</strong> {data.id}
                </div>
                <div style={styles.field}>
                    <strong>Type:</strong> {data.type}
                </div>
                <div style={styles.field}>
                    <strong>Status:</strong>
                    <span style={{ ...styles.badge, backgroundColor: statusColor(data.status) }}>
                        {data.status}
                    </span>
                </div>
                {data.summary && (
                    <div style={styles.field}>
                        <strong>Summary:</strong> {data.summary}
                    </div>
                )}
                {isSurface && (
                    <>
                        {data.component && (
                            <div style={styles.field}>
                                <strong>Component:</strong> {data.component}
                            </div>
                        )}
                        {data.route && (
                            <div style={styles.field}>
                                <strong>Route:</strong> {data.route}
                            </div>
                        )}
                        {data.template && (
                            <div style={styles.field}>
                                <strong>Template:</strong> {data.template}
                            </div>
                        )}
                        {Object.keys(variants).length > 0 && (
                            <div style={styles.field}>
                                <strong>Variants:</strong>
                                <select
                                    value={currentVariant ?? ''}
                                    onChange={e => handleVariantChange(data.id, e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="">(base)</option>
                                    {Object.entries(variants).map(([id, variant]) => (
                                        <option key={id} value={id}>
                                            {id} — {variant.description}
                                        </option>
                                    ))}
                                </select>
                                {currentVariant && variants[currentVariant] && (
                                    <button
                                        onClick={() => handlePromoteVariant(data.id, currentVariant)}
                                        style={styles.promoteBtn}
                                    >
                                        Promote
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <h2 style={styles.title}>UISG Graph Editor</h2>
                <div style={styles.toolbarActions}>
                    <button onClick={() => setEditorState(p => ({ ...p, mode: 'edit' }))} style={styles.btn}>
                        Edit
                    </button>
                    <button onClick={() => setEditorState(p => ({ ...p, mode: 'preview' }))} style={styles.btn}>
                        Preview
                    </button>
                    <button onClick={() => exportGraph()} style={styles.btn}>
                        Export Graph
                    </button>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {loading && <div style={styles.loading}>Loading graph...</div>}

            {!loading && !error && (
                <div style={styles.main}>
                    <div style={styles.graphContainer} ref={containerRef}>
                        <CytoscapeGraph
                            nodes={editorState.nodes}
                            edges={editorState.edges}
                            onNodeSelect={handleNodeSelect}
                            selectedNode={editorState.selectedNode}
                        />
                    </div>

                    <div style={styles.sidebar}>
                        <div style={styles.sidebarSection}>
                            <h3 style={styles.sidebarTitle}>Properties</h3>
                            {renderNodeInfo(editorState.nodes.find(n => n.id === editorState.selectedNode))}
                        </div>

                        {editorState.previewSurface && (
                            <div style={styles.sidebarSection}>
                                <h3 style={styles.sidebarTitle}>Live Preview</h3>
                                <SurfacePreview surfaceId={editorState.previewSurface} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function CytoscapeGraph({
    nodes,
    edges,
    onNodeSelect,
    selectedNode,
}: {
    nodes: EditorState['nodes'];
    edges: EditorState['edges'];
    onNodeSelect: (id: string) => void;
    selectedNode: string | null;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const cyRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current || cyRef.current) return;

        // Dynamic import for Cytoscape (lazy-loaded)
        import('cytoscape').then(({ default: cytoscape }) => {
            import('cytoscape-dagre').then(({ default: dagre }) => {
                cytoscape.use(dagre);

                const cy = cytoscape({
                    container: containerRef.current!,
                    elements: [
                        ...nodes.map(n => ({
                            data: { id: n.id, label: n.label, type: n.type, status: n.status },
                            position: { x: n.x, y: n.y },
                            classes: n.id === selectedNode ? 'selected' : '',
                        })),
                        ...edges.map(e => ({
                            data: { id: e.id, source: e.from, target: e.to, label: e.label },
                        })),
                    ],
                    style: [
                        {
                            selector: 'node',
                            style: {
                                'label': 'data(label)',
                                'font-size': '10px',
                                'text-wrap': 'wrap',
                                'text-max-width': '120px',
                                'background-color': (ele: any) => typeColor(ele.data('type')),
                                'border-width': 2,
                                'border-color': '#fff',
                                'color': '#1b1d21',
                                'width': '120px',
                                'height': '60px',
                                'shape': (ele: any) => nodeShape(ele.data('type')),
                            },
                        },
                        {
                            selector: 'node.selected',
                            style: {
                                'border-color': '#6366f1',
                                'border-width': 4,
                            },
                        },
                        {
                            selector: 'edge',
                            style: {
                                'curve-style': 'bezier',
                                'target-arrow-shape': 'triangle',
                                'target-arrow-color': '#999',
                                'line-color': '#999',
                                'font-size': '8px',
                                'label': 'data(label)',
                                'text-rotation': 'autorotate',
                            },
                        },
                    ],
                    layout: {
                        name: 'dagre',
                        rankDir: 'LR',
                        nodeSep: 80,
                        rankSep: 100,
                        edgeSep: 20,
                    },
                    minZoom: 0.3,
                    maxZoom: 2,
                });

                cy.on('tap', 'node', (evt: any) => {
                    onNodeSelect(evt.target.id());
                });

                cyRef.current = cy;
            });
        });

        return () => {
            if (cyRef.current) {
                cyRef.current.destroy();
                cyRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (cyRef.current && selectedNode) {
            cyRef.current.$(`#${selectedNode}`).select();
        }
    }, [selectedNode]);

    return <div ref={containerRef} style={styles.cytoscapeContainer} />;
}

function SurfacePreview({ surfaceId }: { surfaceId: string }) {
    // In a real implementation, this would render the actual surface component
    // For now, show a placeholder with surface info
    return (
        <div style={styles.preview}>
            <div style={styles.previewHeader}>
                <strong>Surface:</strong> {surfaceId}
            </div>
            <div style={styles.previewContent}>
                <p>Live preview would render the surface component here.</p>
                <p>Context: <select style={styles.select}><option>desktop</option><option>mobile</option></select></p>
                <p>Theme: <select style={styles.select}><option>default</option><option>dark</option><option>light</option></select></p>
                <p>Viewport: <select style={styles.select}><option>desktop-1440</option><option>mobile-390</option></select></p>
            </div>
        </div>
    );
}

function exportGraph() {
    // In a real implementation, this would download the graph.json
    alert('Export would download graph.json with current changes.');
}

function typeColor(type: string): string {
    const colors: Record<string, string> = {
        intent: '#6366f1',
        capability: '#8b5cf6',
        flow: '#06b6d4',
        step: '#22c55e',
        surface: '#f59e0b',
        predicate: '#ef4444',
        effect: '#ec4899',
    };
    return colors[type] ?? '#999';
}

function nodeShape(type: string): string {
    const shapes: Record<string, string> = {
        intent: 'ellipse',
        capability: 'hexagon',
        flow: 'rectangle',
        step: 'round-rectangle',
        surface: 'diamond',
        predicate: 'triangle',
        effect: 'vee',
    };
    return shapes[type] ?? 'ellipse';
}

function statusColor(status: string): string {
    const colors: Record<string, string> = {
        implemented: '#22c55e',
        partial: '#f59e0b',
        planned: '#6366f1',
        candidate: '#8b5cf6',
        experimental: '#ec4899',
        removed: '#ef4444',
        rejected: '#999',
    };
    return colors[status] ?? '#999';
}

const styles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#fafafa', fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: '#fff', borderBottom: '1px solid #e5e5e5' },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 600 },
    toolbarActions: { display: 'flex', gap: '0.5rem' },
    btn: { padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' },
    error: { padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecaca' },
    loading: { padding: '2rem', textAlign: 'center', color: '#6b7280' },
    main: { display: 'flex', flex: 1, overflow: 'hidden' },
    graphContainer: { flex: 1, minWidth: 0 },
    cytoscapeContainer: { width: '100%', height: '100%' },
    sidebar: { width: '320px', background: '#fff', borderLeft: '1px solid #e5e5e5', overflow: 'auto', display: 'flex', flexDirection: 'column' },
    sidebarSection: { padding: '1rem', borderBottom: '1px solid #e5e5e5' },
    sidebarTitle: { margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280' },
    panel: { padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
    panelTitle: { margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 },
    field: { marginBottom: '0.75rem', fontSize: '0.875rem' },
    badge: { display: 'inline-block', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, color: '#fff', marginLeft: '0.5rem' },
    select: { marginLeft: '0.5rem', padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem' },
    promoteBtn: { marginLeft: '0.5rem', padding: '0.25rem 0.5rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' },
    preview: { padding: '1rem', background: '#f9fafb', borderRadius: '8px' },
    previewHeader: { marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #e5e5e5', fontSize: '0.875rem' },
    previewContent: { fontSize: '0.875rem', color: '#6b7280' },
};

export default GraphEditor;