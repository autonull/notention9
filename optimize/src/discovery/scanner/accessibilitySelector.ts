import { Page, Locator } from '@playwright/test';

export interface AriaSnapshotOptions {
    mode?: 'default' | 'ai';
    depth?: number;
    root?: Locator;
}

export interface AccessibilitySelector {
    role: string;
    name?: string;
    selector: string;
    confidence: 'high' | 'medium' | 'low';
    ariaSnapshot: string;
    alternatives: Array<{ role?: string; name?: string; testId?: string; label?: string }>;
}

export interface LiveSelectorResult {
    selectors: AccessibilitySelector[];
    pageUrl: string;
    timestamp: string;
}

export class AccessibilitySelectorDeriver {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // Derive selectors from live page using ariaSnapshot
    async deriveSelectors(options: AriaSnapshotOptions = {}): Promise<LiveSelectorResult> {
        const root = options.root || this.page.locator('body');
        const snapshot = await root.ariaSnapshot({
            mode: options.mode ?? 'default',
            depth: options.depth,
        });

        const selectors = this.parseAriaSnapshot(snapshot);

        return {
            selectors,
            pageUrl: this.page.url(),
            timestamp: new Date().toISOString(),
        };
    }

    // Parse YAML ariaSnapshot into structured selectors
    private parseAriaSnapshot(snapshot: string): AccessibilitySelector[] {
        const selectors: AccessibilitySelector[] = [];
        const lines = snapshot.split('\n');
        let currentPath: string[] = [];
        let currentIndent = -1;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Calculate indent
            const indent = line.length - line.trimStart().length;
            const isChild = indent > currentIndent;
            const isSibling = indent === currentIndent;

            if (isChild) {
                currentPath.push(trimmed);
            } else if (isSibling) {
                currentPath[currentPath.length - 1] = trimmed;
            } else {
                // Going up
                const levelsUp = Math.floor((currentIndent - indent) / 2) + 1;
                currentPath = currentPath.slice(0, -levelsUp);
                currentPath.push(trimmed);
            }

            currentIndent = indent;

            // Parse the node
            const parsed = this.parseAriaNode(trimmed, currentPath.join(' > '));
            if (parsed) {
                selectors.push(parsed);
            }
        }

        return selectors;
    }

    private parseAriaNode(nodeText: string, path: string): AccessibilitySelector | null {
        // Format: role "name" [attributes]
        // Example: button "Add detail" [focusable]
        const match = nodeText.match(/^(\w+)(?:\s+"([^"]+)")?(?:\s+\[([^\]]+)\])?/);
        if (!match) return null;

        const [, role, name, attributes] = match;

        // Skip non-interactive elements unless they have a name
        const interactiveRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'switch', 'slider', 'menuitem', 'tab', 'option', 'searchbox', 'spinbutton'];
        if (!interactiveRoles.includes(role) && !name) {
            return null;
        }

        // Build CSS selector from path
        const selector = this.pathToSelector(path, role, name);

        // Determine confidence
        const confidence = name ? 'high' : (interactiveRoles.includes(role) ? 'medium' : 'low');

        // Generate alternatives
        const alternatives = this.generateAlternatives(role, name);

        return {
            role,
            name,
            selector,
            confidence,
            ariaSnapshot: nodeText,
            alternatives,
        };
    }

    private pathToSelector(path: string, role: string, name?: string): string {
        // Convert aria path to CSS selector
        const parts = path.split(' > ').filter(p => p.trim());
        const selectorParts: string[] = [];

        for (const part of parts) {
            const match = part.match(/^(\w+)(?:\s+"([^"]+)")?/);
            if (match) {
                const [, partRole, partName] = match;
                if (partName) {
                    selectorParts.push(`[role="${partRole}"][name="${partName}"]`);
                } else {
                    selectorParts.push(`[role="${partRole}"]`);
                }
            }
        }

        return selectorParts.join(' > ') || `[role="${role}"]${name ? `[name="${name}"]` : ''}`;
    }

    private generateAlternatives(role: string, name?: string): Array<{ role?: string; name?: string; testId?: string; label?: string }> {
        const alternatives: Array<{ role?: string; name?: string; testId?: string; label?: string }> = [];

        if (name) {
            alternatives.push({ role, name });
            alternatives.push({ label: name });
            alternatives.push({ testId: name.toLowerCase().replace(/\s+/g, '-') });
        }

        if (role === 'button') {
            alternatives.push({ role: 'button' });
        } else if (role === 'link') {
            alternatives.push({ role: 'link' });
        } else if (role === 'textbox') {
            alternatives.push({ role: 'textbox' });
        } else if (role === 'combobox') {
            alternatives.push({ role: 'combobox' });
        }

        return alternatives;
    }

    // Derive selectors for specific intents
    async deriveSelectorsForIntents(intents: string[]): Promise<Map<string, AccessibilitySelector[]>> {
        const result = new Map<string, AccessibilitySelector[]>();
        const snapshot = await this.deriveSelectors();

        for (const intent of intents) {
            const matching = snapshot.selectors.filter(s =>
                this.matchesIntent(s, intent)
            );
            if (matching.length > 0) {
                result.set(intent, matching);
            }
        }

        return result;
    }

    private matchesIntent(selector: AccessibilitySelector, intent: string): boolean {
        const intentKeywords: Record<string, string[]> = {
            'note.addProperty': ['add', 'detail', 'property'],
            'note.insertProperty': ['add', 'detail', 'property', 'submit'],
            'note.publish': ['publish'],
            'note.acceptExtraction': ['accept'],
            'note.rejectExtraction': ['reject'],
            'note.select': ['note', 'title'],
            'note.save': ['save'],
            'note.delete': ['delete', 'remove'],
            'form.submit': ['submit', 'save'],
            'input.change': ['input', 'textarea', 'textbox'],
        };

        const keywords = intentKeywords[intent] || intent.split('.');
        const searchText = `${selector.role} ${selector.name || ''}`.toLowerCase();

        return keywords.some(k => searchText.includes(k.toLowerCase()));
    }

    // Export selectors in journey-compatible format
    exportForJourney(result: LiveSelectorResult): Record<string, { role?: string; name?: string; testId?: string; label?: string }> {
        const exported: Record<string, { role?: string; name?: string; testId?: string; label?: string }> = {};

        for (const selector of result.selectors) {
            const key = selector.name
                ? selector.name.toLowerCase().replace(/\s+/g, '-')
                : `${selector.role}-${selector.selector}`.replace(/[^a-z0-9-]/g, '');

            exported[key] = {
                role: selector.role,
                name: selector.name,
                label: selector.name,
                ...(selector.alternatives[0] || {}),
            };
        }

        return exported;
    }
}

// Standalone function for use in tests
export async function deriveSelectorsFromPage(page: Page, options: AriaSnapshotOptions = {}): Promise<LiveSelectorResult> {
    const deriver = new AccessibilitySelectorDeriver(page);
    return deriver.deriveSelectors(options);
}