import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

export interface EventHandler {
    component: string;
    file: string;
    event: string; // onClick, onSubmit, onChange, etc.
    handler: string; // function name
    handlerType: 'inline' | 'method' | 'prop' | 'hook';
    element: string; // JSX element tag
    elementProps: Record<string, string>;
    line: number;
    intent?: string;
}

export interface ActionFlow {
    source: EventHandler;
    target: string; // function called
    calls: ActionCall[];
    async: boolean;
}

export interface ActionCall {
    function: string;
    file: string;
    args: string[];
    returns: string;
    sideEffects: string[];
}

export class EventFlowScanner {
    private uiRoot: string = '';

    scan(projectRoot: string = '/home/me/notention9'): EventHandler[] {
        const handlers: EventHandler[] = [];
        this.uiRoot = `${projectRoot}/ui/src`;
        const files = globSync('**/*.tsx', { cwd: this.uiRoot, absolute: true });

        for (const file of files) {
            const content = readFileSync(file, 'utf-8');
            const fileHandlers = this.scanFile(file, content);
            handlers.push(...fileHandlers);
        }

        return handlers;
    }

    private scanFile(file: string, content: string): EventHandler[] {
        const handlers: EventHandler[] = [];
        const lines = content.split('\n');

        // Find component name
        const componentMatch = content.match(/export\s+(?:function|const)\s+(\w+)/);
        const componentName = componentMatch?.[1] || file.split('/').pop()?.replace('.tsx', '') || 'Unknown';

        // Scan for event handlers in JSX
        const eventPatterns = [
            /onClick\s*=\s*\{([^}]+)\}/g,
            /onSubmit\s*=\s*\{([^}]+)\}/g,
            /onChange\s*=\s*\{([^}]+)\}/g,
            /onKeyDown\s*=\s*\{([^}]+)\}/g,
            /onKeyUp\s*=\s*\{([^}]+)\}/g,
            /onFocus\s*=\s*\{([^}]+)\}/g,
            /onBlur\s*=\s*\{([^}]+)\}/g,
            /onMouseDown\s*=\s*\{([^}]+)\}/g,
            /onMouseUp\s*=\s*\{([^}]+)\}/g,
            /onDoubleClick\s*=\s*\{([^}]+)\}/g,
            /onDragStart\s*=\s*\{([^}]+)\}/g,
            /onDrop\s*=\s*\{([^}]+)\}/g,
        ];

        const eventNames = ['onClick', 'onSubmit', 'onChange', 'onKeyDown', 'onKeyUp', 'onFocus', 'onBlur', 'onMouseDown', 'onMouseUp', 'onDoubleClick', 'onDragStart', 'onDrop'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            for (let j = 0; j < eventPatterns.length; j++) {
                const pattern = eventPatterns[j];
                const eventName = eventNames[j];
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const handlerCode = match[1];
                    const handlerInfo = this.analyzeHandler(handlerCode, content, lines, i);
                    handlers.push({
                        component: componentName,
                        file: file.replace(`${this.uiRoot}/`, ''),
                        event: eventName,
                        handler: handlerInfo.name,
                        handlerType: handlerInfo.type,
                        element: this.findElementTag(lines, i),
                        elementProps: this.extractElementProps(line),
                        line: i + 1,
                        intent: this.inferIntent(handlerInfo.name, componentName),
                    });
                }
            }
        }

        return handlers;
    }

    private analyzeHandler(handlerCode: string, fullContent: string, lines: string[], lineIndex: number): { name: string; type: 'inline' | 'method' | 'prop' | 'hook' } {
        // Inline arrow function
        if (handlerCode.includes('=>') || handlerCode.includes('function')) {
            return { name: 'inline', type: 'inline' };
        }

        // Method call: handleClick()
        const methodCallMatch = handlerCode.match(/(\w+)\s*\(/);
        if (methodCallMatch) {
            const methodName = methodCallMatch[1];

            // Check if it's a prop function
            if (fullContent.includes(`${methodName}:`)) {
                return { name: methodName, type: 'prop' };
            }

            // Check if it's a hook function
            if (fullContent.includes(`const ${methodName} =`) || fullContent.includes(`function ${methodName}`)) {
                return { name: methodName, type: 'hook' };
            }

            return { name: methodName, type: 'method' };
        }

        // Simple reference: handleClick
        const simpleRef = handlerCode.trim();
        if (/^\w+$/.test(simpleRef)) {
            return { name: simpleRef, type: 'method' };
        }

        return { name: 'unknown', type: 'inline' };
    }

    private findElementTag(lines: string[], lineIndex: number): string {
        // Look backwards for the opening tag
        for (let i = lineIndex; i >= 0; i--) {
            const tagMatch = lines[i].match(/<(\w+)(?:\s|>)/);
            if (tagMatch) {
                return tagMatch[1];
            }
        }
        return 'unknown';
    }

    private extractElementProps(line: string): Record<string, string> {
        const props: Record<string, string> = {};
        const propRegex = /(\w+)\s*=\s*(?:"([^"]*)"|\{([^}]*)\})/g;
        let match;
        while ((match = propRegex.exec(line)) !== null) {
            props[match[1]] = match[2] ?? match[3] ?? '';
        }
        return props;
    }

    private inferIntent(handlerName: string, componentName: string): string | undefined {
        const intentMap: Record<string, string> = {
            'handleSubmit': 'form.submit',
            'handleClick': 'button.click',
            'handleChange': 'input.change',
            'handleAddProperty': 'note.addProperty',
            'handleInsertProperty': 'note.insertProperty',
            'handlePublish': 'note.publish',
            'handleAccept': 'note.acceptExtraction',
            'handleReject': 'note.rejectExtraction',
            'handleSave': 'note.save',
            'handleDelete': 'note.delete',
            'handleSelect': 'note.select',
            'onSubmit': 'form.submit',
            'onClick': 'button.click',
            'onChange': 'input.change',
        };

        return intentMap[handlerName] || `${componentName.toLowerCase()}.${handlerName.toLowerCase()}`;
    }

    // Build action flow graph from handlers
    buildActionFlow(handlers: EventHandler[]): Map<string, ActionFlow> {
        const flows = new Map<string, ActionFlow>();

        for (const handler of handlers) {
            const flow: ActionFlow = {
                source: handler,
                target: handler.handler,
                calls: [],
                async: false,
            };

            // Find the handler function and analyze its calls
            const calls = this.findFunctionCalls(handler.handler, handler.file);
            flow.calls = calls;
            flow.async = calls.some(c => c.function.includes('async') || c.function.includes('await'));

            flows.set(`${handler.component}.${handler.event}.${handler.handler}`, flow);
        }

        return flows;
    }

    private findFunctionCalls(functionName: string, file: string): ActionCall[] {
        // This would require more sophisticated analysis
        // For now, return empty - can be enhanced with TS AST
        return [];
    }

    // Get all unique intents from handlers
    getIntents(handlers: EventHandler[]): string[] {
        const intents = new Set<string>();
        for (const handler of handlers) {
            if (handler.intent) {
                intents.add(handler.intent);
            }
        }
        return Array.from(intents).sort();
    }

    // Get handlers by component
    getByComponent(handlers: EventHandler[], component: string): EventHandler[] {
        return handlers.filter(h => h.component === component);
    }

    // Get handlers by intent
    getByIntent(handlers: EventHandler[], intent: string): EventHandler[] {
        return handlers.filter(h => h.intent === intent);
    }
}

export const eventFlowScanner = new EventFlowScanner();