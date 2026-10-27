import { DiscoveryResult, DiscoveredAction } from './componentScanner.js';

interface InferredSelector {
    target: {
        role?: string;
        name?: string;
        testId?: string;
        label?: string;
    };
    confidence: 'high' | 'medium' | 'low';
    source: string;
    alternatives: Array<{ role?: string; name?: string; testId?: string; label?: string }>;
}

export class SelectorInference {
    infer(discovery: DiscoveryResult): Map<string, InferredSelector> {
        const selectors = new Map<string, InferredSelector>();

        // From discovered actions
        for (const action of discovery.actions) {
            const key = `${action.component}.${action.action}`;
            selectors.set(key, {
                target: action.selector,
                confidence: 'high',
                source: `action:${action.component}`,
                alternatives: this.generateAlternatives(action.selector),
            });
        }

        // From dialogs
        for (const dialog of discovery.dialogs) {
            for (const field of dialog.fields) {
                const key = `${dialog.name}.${field.name}`;
                selectors.set(key, {
                    target: this.inferFieldSelector(field),
                    confidence: 'medium',
                    source: `dialog:${dialog.name}`,
                    alternatives: this.generateFieldAlternatives(field),
                });
            }
        }

        // From routes - navigation
        for (const route of discovery.routes) {
            selectors.set(`nav.${route.path}`, {
                target: { role: 'link', name: route.path.replace('#', '') },
                confidence: 'medium',
                source: `route:${route.component}`,
                alternatives: [{ role: 'button', name: route.path.replace('#', '') }],
            });
        }

        return selectors;
    }

    private inferFieldSelector(field: { name: string; type: string; label: string }): { role?: string; name?: string; testId?: string; label?: string } {
        // Prefer label > role > testId
        if (field.label) return { label: field.label };
        if (field.type === 'select') return { role: 'combobox', name: field.name };
        if (field.type === 'custom') return { testId: `property-value-input` };
        return { role: 'textbox', name: field.name };
    }

    private generateAlternatives(selector: { role?: string; name?: string; testId?: string; label?: string }): Array<{ role?: string; name?: string; testId?: string; label?: string }> {
        const alts: Array<{ role?: string; name?: string; testId?: string; label?: string }> = [];

        if (selector.label) {
            alts.push({ role: 'textbox', name: selector.label });
            alts.push({ role: 'combobox', name: selector.label });
        }
        if (selector.role === 'button' && selector.name) {
            alts.push({ testId: selector.name.toLowerCase().replace(/\s+/g, '-') });
        }
        if (selector.testId && typeof selector.testId === 'string') {
            alts.push({ role: 'button', name: selector.testId });
        }

        return alts;
    }

    private generateFieldAlternatives(field: { name: string; type: string; label: string }): Array<{ role?: string; name?: string; testId?: string; label?: string }> {
        return [
            { label: field.label },
            { role: field.type === 'select' ? 'combobox' : 'textbox', name: field.name },
            { testId: field.name.toLowerCase() },
        ];
    }

    // Resolve a Target to the best available selector
    resolve(target: { role?: string; name?: string; testId?: string; label?: string }, selectors: Map<string, InferredSelector>): { role?: string; name?: string; testId?: string; label?: string } {
        // Exact match on testId
        if (target.testId) {
            const found = Array.from(selectors.values()).find(s => s.target.testId === target.testId);
            if (found) return found.target;
        }

        // Match on role + name
        if (target.role && target.name) {
            const found = Array.from(selectors.values()).find(s =>
                s.target.role === target.role && s.target.name === target.name
            );
            if (found) return found.target;
        }

        // Match on label
        if (target.label) {
            const found = Array.from(selectors.values()).find(s => s.target.label === target.label);
            if (found) return found.target;
        }

        // Return original if no match
        return target;
    }
}

export const selectorInference = new SelectorInference();