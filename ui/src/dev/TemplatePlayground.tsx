// ui/src/dev/TemplatePlayground.tsx - Template AST Builder Playground
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useSearchParams } from 'react-router-dom';

interface TemplateAST {
    shape: string;
    target: 'react' | 'html' | 'json';
    component: string;
    propsSchema: Record<string, any>;
    test: string;
}

interface SurfaceData {
    id: string;
    name: string;
    component: string;
    template?: string;
    propsSchema?: Record<string, any>;
    variants?: Record<string, any>;
    defaultVariant?: string;
}

interface GraphData {
    version: number;
    nodes: Array<{ id: string; name: string; type: string; [key: string]: any }>;
    edges: Array<{ from: string; type: string; to: string }>;
}

const SHAPES = ['item', 'panel', 'editor', 'status'] as const;
const TARGETS = ['react', 'html', 'json'] as const;

const TEMPLATE_CODE = `import { z } from 'zod';
import type { UisgGraph, UisgSurface } from '@notention/optimize/src/uisg/types';
import type { TemplateShape, TemplateTarget } from '@notention/optimize/src/uisg/templates/render';

export const MyCustomTemplate: Template = {
    shape: 'my-custom',
    
    generateComponent(surface: UisgSurface, graph: UisgGraph, target: TemplateTarget): string {
        const props = surface.propsSchema ? Object.keys(surface.propsSchema).join(', ') : '';
        
        if (target === 'react') {
            return \`
import React from 'react';
import type { PropsSchema } from './\${surface.component}Props';

export function \${surface.component}(\${props}: PropsSchema) {
    return (
        <div className="my-custom-template" data-testid="\${surface.id}">
            <h2>\${surface.name}</h2>
            <p>Custom template for \${surface.id}</p>
        </div>
    );
}
\`;
        }
        
        if (target === 'html') {
            return \`
<div class="my-custom-template" data-testid="\${surface.id}">
    <h2>\${surface.name}</h2>
    <p>Custom template for \${surface.id}</p>
</div>
\`;
        }
        
        return JSON.stringify({ shape: 'my-custom', surface: surface.id }, null, 2);
    },
    
    generateTest(surface: UisgSurface, graph: UisgGraph, target: TemplateTarget): string {
        return \`
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { \${surface.component} } from './\${surface.component}';

test('\${surface.component} renders', () => {
    render(<\${surface.component} />);
    expect(screen.getByTestId('\${surface.id}')).toBeInTheDocument();
});
\`;
    },
    
    generatePropsSchema(surface: UisgSurface, graph: UisgGraph): string {
        const props = surface.propsSchema ? Object.entries(surface.propsSchema).map(([key, def]) => 
            \`  \${key}: z.any() // \${def.description ?? 'no description'}\`
        ).join('\\n') : '';
        
        return \`
import { z } from 'zod';

export const \${surface.component}PropsSchema = z.object({
\${props}
});

export type \${surface.component}Props = z.infer<typeof \${surface.component}PropsSchema>;
\`;
    },
};

export default MyCustomTemplate;`;

export function TemplatePlayground(): JSX.Element {
    const [searchParams] = useSearchParams();
    const [graph, setGraph] = useState<GraphData | null>(null);
    const [surfaces, setSurfaces] = useState<SurfaceData[]>([]);
    const [selectedSurface, setSelectedSurface] = useState<SurfaceData | null>(null);
    const [shape, setShape] = useState<'item' | 'panel' | 'editor' | 'status'>('item');
    const [target, setTarget] = useState<'react' | 'html' | 'json'>('react');
    const [code, setCode] = useState(TEMPLATE_CODE);
    const [generated, setGenerated] = useState<TemplateAST | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        async function loadGraph() {
            try {
                const res = await fetch('/doc/uisg/graph.json');
                if (!res.ok) throw new Error('Failed to load graph');
                const data = await res.json();
                setGraph(data);
                const nodes = (data as { nodes: Array<Record<string, any>> }).nodes;
                const surfaceNodes = nodes.filter((n: Record<string, any>) => n.type === 'surface');
                setSurfaces(surfaceNodes.map((n: Record<string, any>) => ({
                    id: n.id,
                    name: n.name,
                    component: n.component ?? n.id.replace('surface.', ''),
                    template: n.template,
                    propsSchema: n.propsSchema,
                    variants: n.variants,
                    defaultVariant: n.defaultVariant,
                })));
                if (surfaceNodes[0]) {
                    setSelectedSurface(surfaceNodes[0] as unknown as SurfaceData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }
        loadGraph();
    }, []);

    useEffect(() => {
        if (!selectedSurface) return;
        generatePreview();
    }, [selectedSurface, shape, target, code]);

    async function generatePreview() {
        if (!selectedSurface) return;

        try {
            // In a real implementation, this would use the template AST builder
            // For now, simulate generation based on shape
            const component = generateMockComponent(selectedSurface, shape, target);
            const test = generateMockTest(selectedSurface, shape, target);
            const propsSchema = generateMockPropsSchema(selectedSurface);

            setGenerated({
                shape,
                target,
                component,
                propsSchema,
                test,
            });

            if (target === 'react') {
                setPreviewHtml(component);
            } else if (target === 'html') {
                setPreviewHtml(component);
            } else {
                setPreviewHtml(`<pre>${component}</pre>`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        }
    }

    function generateMockComponent(surface: SurfaceData, shape: string, target: string): string {
        const componentName = surface.component ?? surface.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
        
        if (target === 'react') {
            return `// Generated React Component for ${surface.id} (${shape})
import React from 'react';

export function ${componentName}(props: any) {
    return (
        <div className="template-${shape}" data-testid="${surface.id}">
            <header className="template-header">
                <h3>${surface.name}</h3>
                <span className="badge">${shape}</span>
            </header>
            <main className="template-body">
                <p>Shape: ${shape}</p>
                <p>Target: ${target}</p>
                <p>Surface: ${surface.id}</p>
                <PropsPanel props={props} />
            </main>
        </div>
    );
}

function PropsPanel({ props }: { props: any }) {
    if (!props || Object.keys(props).length === 0) {
        return <p className="muted">No props defined</p>;
    }
    return (
        <table className="props-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
                \${Object.entries(props).map(([key, def]: [string, any]) => 
                    \`<tr><td>\${key}</td><td>\${def?.type ?? 'any'}</td><td>\${def?.description ?? ''}</td></tr>\`
                ).join('')}
            </tbody>
        </table>
    );
}`;
        }
        
        if (target === 'html') {
            return `<div class="template-${shape}" data-testid="${surface.id}">
    <header class="template-header">
        <h3>${surface.name}</h3>
        <span class="badge">${shape}</span>
    </header>
    <main class="template-body">
        <p>Shape: ${shape}</p>
        <p>Target: ${target}</p>
        <p>Surface: ${surface.id}</p>
    </main>
</div>`;
        }
        
        return JSON.stringify({ shape, target, surface: surface.id, componentName }, null, 2);
    }

    function generateMockTest(surface: SurfaceData, shape: string, target: string): string {
        const componentName = surface.component ?? surface.id.replace('surface.', '').replace(/-./g, m => m[1].toUpperCase());
        
        if (target === 'react') {
            return `// Generated Test for ${surface.id} (${shape})
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

test('${componentName} renders correctly', () => {
    render(<${componentName} />);
    expect(screen.getByTestId('${surface.id}')).toBeInTheDocument();
    expect(screen.getByText('${surface.name}')).toBeInTheDocument();
});`;
        }
        
        return `// Generated Test for ${surface.id} (${shape})
// Target: ${target}
console.log('Test for ${componentName}');`;
    }

    function generateMockPropsSchema(surface: SurfaceData): Record<string, any> {
        return surface.propsSchema ?? {
            title: { type: 'string', description: 'Surface title' },
            items: { type: 'array', description: 'List of items' },
        };
    }

    function handleRunCode() {
        generatePreview();
    }

    function handleExport() {
        const blob = new Blob([code], { type: 'text/typescript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedSurface?.id ?? 'template'}-custom.ts`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <h2 style={styles.title}>Template Playground</h2>
                <div style={styles.toolbarControls}>
                    <div style={styles.control}>
                        <label>Surface:</label>
                        <select
                            value={selectedSurface?.id ?? ''}
                            onChange={e => setSelectedSurface(surfaces.find(s => s.id === e.target.value) ?? null)}
                            style={styles.select}
                        >
                            {surfaces.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.control}>
                        <label>Shape:</label>
                        <select value={shape} onChange={e => setShape(e.target.value as any)} style={styles.select}>
                            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div style={styles.control}>
                        <label>Target:</label>
                        <select value={target} onChange={e => setTarget(e.target.value as any)} style={styles.select}>
                            {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <button onClick={handleRunCode} style={styles.btnPrimary}>▶ Generate</button>
                    <button onClick={handleExport} style={styles.btnSecondary}>Export Template</button>
                </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {loading && <div style={styles.loading}>Loading graph...</div>}

            {!loading && !error && (
                <div style={styles.main}>
                    <div style={styles.editorPanel}>
                        <div style={styles.panelHeader}>
                            <h3>Template Code (TypeScript)</h3>
                        </div>
                        <textarea
                            ref={editorRef}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            style={styles.codeEditor}
                            spellCheck={false}
                            placeholder="// Write your template here..."
                        />
                    </div>

                    <div style={styles.previewPanel}>
                        <div style={styles.panelHeader}>
                            <h3>Live Preview ({target})</h3>
                        </div>
                        <div style={styles.previewContent} dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>

                    {generated && (
                        <div style={styles.outputPanel}>
                            <div style={styles.panelHeader}>
                                <h3>Generated Outputs</h3>
                            </div>
                            <div style={styles.tabs}>
                                <button style={styles.tabActive}>Component</button>
                                <button style={styles.tab}>Test</button>
                                <button style={styles.tab}>Props Schema</button>
                            </div>
                            <pre style={styles.outputCode}>
                                {target === 'react' ? generated.component :
                                 target === 'html' ? generated.component :
                                 generated.component}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#fafafa', fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
    toolbar: { display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1.5rem', background: '#fff', borderBottom: '1px solid #e5e5e5' },
    title: { margin: 0, fontSize: '1.25rem', fontWeight: 600 },
    toolbarControls: { display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' },
    control: { display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '150px' },
    select: { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', background: '#fff' },
    btnPrimary: { padding: '0.5rem 1rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 },
    btnSecondary: { padding: '0.5rem 1rem', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' },
    error: { padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderBottom: '1px solid #fecaca' },
    loading: { padding: '2rem', textAlign: 'center', color: '#6b7280' },
    main: { display: 'flex', flex: 1, overflow: 'hidden', gap: '1rem', padding: '1rem' },
    editorPanel: { flex: 1, minWidth: 0, background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' },
    previewPanel: { width: '400px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' },
    outputPanel: { flex: 1, minWidth: 0, background: '#fff', borderRadius: '8px', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' },
    panelHeader: { padding: '0.75rem 1rem', borderBottom: '1px solid #e5e5e5' },
    codeEditor: { flex: 1, padding: '1rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.875rem', lineHeight: 1.6, border: 'none', outline: 'none', resize: 'none', background: '#1e1e1e', color: '#d4d4d4' },
    previewContent: { flex: 1, padding: '1rem', overflow: 'auto', border: '1px dashed #e5e5e5', margin: '1rem', borderRadius: '6px', minHeight: '200px' },
    tabs: { display: 'flex', borderBottom: '1px solid #e5e5e5', padding: '0 1rem' },
    tabActive: { padding: '0.5rem 1rem', borderBottom: '2px solid #6366f1', color: '#6366f1', background: 'none', cursor: 'pointer', fontSize: '0.875rem' },
    tab: { padding: '0.5rem 1rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' },
    outputCode: { flex: 1, padding: '1rem', overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8rem', lineHeight: 1.5, margin: 0, background: '#1e1e1e', color: '#d4d4d4' },
};

export default TemplatePlayground;