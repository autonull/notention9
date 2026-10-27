import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

interface TraceEmitter {
    file: string;
    function: string;
    traceType: 'prompt' | 'action';
    promptId?: string;
    intent?: string;
    line: number;
    context: string;
}

export class TraceEmitterScanner {
    scan(projectRoot: string = '/home/me/notention9'): TraceEmitter[] {
        const emitters: TraceEmitter[] = [];

        // Scan core for prompt traces
        emitters.push(...this.scanDir(`${projectRoot}/core/src`, 'prompt'));
        // Scan agent for action traces
        emitters.push(...this.scanDir(`${projectRoot}/agent/src`, 'action'));
        // Scan UI for action traces
        emitters.push(...this.scanDir(`${projectRoot}/ui/src`, 'action'));

        return emitters;
    }

    private scanDir(dir: string, defaultType: 'prompt' | 'action'): TraceEmitter[] {
        const emitters: TraceEmitter[] = [];
        const files = globSync('**/*.ts', { cwd: dir, absolute: true });

        for (const file of files) {
            const content = readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // addPromptTrace calls
                if (line.includes('addPromptTrace(')) {
                    const promptId = this.extractPromptId(line, lines, i);
                    emitters.push({
                        file: file.replace(`${dir}/`, ''),
                        function: this.findContainingFunction(lines, i),
                        traceType: 'prompt',
                        promptId,
                        line: i + 1,
                        context: line.trim(),
                    });
                }

                // addActionTrace calls
                if (line.includes('addActionTrace(')) {
                    const intent = this.extractIntent(line, lines, i);
                    emitters.push({
                        file: file.replace(`${dir}/`, ''),
                        function: this.findContainingFunction(lines, i),
                        traceType: 'action',
                        intent,
                        line: i + 1,
                        context: line.trim(),
                    });
                }

                // Direct traceSink.emit calls
                if (line.includes('traceSink') && (line.includes('.prompt(') || line.includes('.action('))) {
                    const traceType = line.includes('.prompt(') ? 'prompt' : 'action';
                    const promptId = this.extractPromptId(line, lines, i);
                    const intent = this.extractIntent(line, lines, i);
                    emitters.push({
                        file: file.replace(`${dir}/`, ''),
                        function: this.findContainingFunction(lines, i),
                        traceType,
                        promptId,
                        intent,
                        line: i + 1,
                        context: line.trim(),
                    });
                }
            }
        }

        return emitters;
    }

    private extractPromptId(line: string, lines: string[], index: number): string | undefined {
        // Look for promptId in the call or surrounding lines
        const context = lines.slice(Math.max(0, index - 3), index + 3).join('\n');
        const match = context.match(/promptId\s*:\s*['"`]([^'"`]+)['"`]/);
        return match?.[1];
    }

    private extractIntent(line: string, lines: string[], index: number): string | undefined {
        const context = lines.slice(Math.max(0, index - 3), index + 3).join('\n');
        const match = context.match(/intent\s*:\s*['"`]([^'"`]+)['"`]/);
        return match?.[1];
    }

    private findContainingFunction(lines: string[], index: number): string {
        for (let i = index; i >= 0; i--) {
            const match = lines[i].match(/(?:function|const|async)\s+(\w+)/);
            if (match) return match[1];
        }
        return 'anonymous';
    }

    // Known emitters from AD-8/§4.4 table
    static readonly KNOWN_EMITTERS: TraceEmitter[] = [
        {
            file: 'core/src/extraction/deterministic.ts',
            function: 'alignToOntology',
            traceType: 'prompt',
            promptId: 'property-extraction',
            line: 0,
            context: 'PromptTrace{promptId:\"property-extraction\", outcome:\"suggested\"}',
        },
        {
            file: 'agent/src/intelligence/LlmPropertyExtractor.ts',
            function: 'extract',
            traceType: 'prompt',
            promptId: 'property-extraction',
            line: 0,
            context: 'PromptTrace{confidence, parsed, outcome}',
        },
        {
            file: 'core/src/notes/notes.ts',
            function: 'NotePipeline.updateContent',
            traceType: 'action',
            intent: 'note.updateContent',
            line: 0,
            context: 'ActionTrace{intent:\"note.updateContent\", stateChanges}',
        },
        {
            file: 'core/src/notes/notes.ts',
            function: 'NotePipeline.upsertProperty',
            traceType: 'action',
            intent: 'note.upsertProperty',
            line: 0,
            context: 'ActionTrace{intent:\"note.upsertProperty\", stateChanges}',
        },
        {
            file: 'core/src/notes/notes.ts',
            function: 'NotePipeline.removeProperty',
            traceType: 'action',
            intent: 'note.removeProperty',
            line: 0,
            context: 'ActionTrace{intent:\"note.removeProperty\", stateChanges}',
        },
        {
            file: 'ui/src/hooks/useEditorPublishing.ts',
            function: 'privacy gate',
            traceType: 'action',
            intent: 'note.publish',
            line: 0,
            context: 'ActionTrace{intent:\"note.publish\", confirmations, outcome:\"requires_confirmation\"}',
        },
        {
            file: 'agent/src/server/McpToolRegistry.ts',
            function: 'tool handler',
            traceType: 'action',
            intent: 'tool.*',
            line: 0,
            context: 'ActionTrace{intent:\"tool.*\", toolCalls, outcome}',
        },
    ];
}

export const traceEmitterScanner = new TraceEmitterScanner();