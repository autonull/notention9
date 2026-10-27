import { DiscoveryEngine } from './index.js';
import type { JourneySpec } from '../journey.js';

export interface ParsedGoal {
    entryComponent: string;
    targetState: TargetStatePredicate;
    constraints: GoalConstraints;
    actions: InferredAction[];
}

export interface TargetStatePredicate {
    type: 'property' | 'route' | 'note' | 'editor' | 'review' | 'confirmation';
    path: string;
    operator: 'equals' | 'contains' | 'exists' | 'notEquals';
    value?: unknown;
}

export interface GoalConstraints {
    privacy?: 'private' | 'public' | 'any';
    requireConfirmation?: boolean;
    maxSteps?: number;
    avoid?: string[];
}

export interface InferredAction {
    intent: string;
    component: string;
    action: string;
    selector: {
        role?: string;
        name?: string;
        testId?: string;
        label?: string;
    };
    params?: Record<string, unknown>;
}

export class GoalParser {
    private discoveryEngine: DiscoveryEngine;

    constructor(discoveryEngine?: DiscoveryEngine) {
        this.discoveryEngine = discoveryEngine || new DiscoveryEngine();
    }

    parse(goal: string, projectRoot: string = '/home/me/notention9'): ParsedGoal {
        const lower = goal.toLowerCase();
        const discovery = this.discoveryEngine.discoverWithTypes(projectRoot);
        const selectors = discovery.statePathRegistry;
        const components = discovery.discovery;
        const actions = components.actions;

        // Determine entry component from current route or default
        const entryComponent = this.inferEntryComponent(lower, components);

        // Parse target state
        const targetState = this.inferTargetState(lower, selectors);

        // Parse constraints
        const constraints = this.inferConstraints(lower);

        // Infer required actions
        const inferredActions = this.inferActions(lower, actions, targetState);

        return {
            entryComponent,
            targetState,
            constraints,
            actions: inferredActions,
        };
    }

    private inferEntryComponent(goal: string, components: { routes: Array<{ path: string; component: string }> }): string {
        // Check for explicit route mentions
        for (const route of components.routes) {
            const routeName = route.path.replace('#', '').replace('/', '-');
            if (goal.includes(routeName) || goal.includes(route.component.toLowerCase())) {
                return route.component;
            }
        }

        // Default to NotesView for note-related goals
        if (goal.includes('note') || goal.includes('capture') || goal.includes('edit') || goal.includes('property')) {
            return 'NotesView';
        }

        // Default to DashboardView
        return 'DashboardView';
    }

    private inferTargetState(goal: string, selectors: import('./statePathRegistry').StatePathRegistry): TargetStatePredicate {
        // Property-related goals
        if (goal.includes('property') || goal.includes('detail') || goal.includes('attribute')) {
            // Extract property key from goal
            const propertyMatch = goal.match(/(?:property|detail|attribute)\s+(?:called|named|key|with)\s+(\w+)/i);
            const key = propertyMatch ? propertyMatch[1] : 'property';

            return {
                type: 'property',
                path: `note.propertyIndex.${key}`,
                operator: 'exists',
            };
        }

        // Route/navigation goals
        if (goal.includes('navigate') || goal.includes('go to') || goal.includes('open')) {
            const routeMatch = goal.match(/(?:navigate|go to|open)\s+(?:#?[\w-]+)/i);
            return {
                type: 'route',
                path: 'route.hash',
                operator: 'equals',
                value: routeMatch ? routeMatch[0].replace(/^(navigate|go to|open)\s+/i, '') : '',
            };
        }

        // Note creation/capture
        if (goal.includes('capture') || goal.includes('create note') || goal.includes('new note')) {
            return {
                type: 'note',
                path: 'note.id',
                operator: 'exists',
            };
        }

        // Editor content
        if (goal.includes('edit') || goal.includes('content') || goal.includes('text')) {
            return {
                type: 'editor',
                path: 'editor.dirty',
                operator: 'equals',
                value: true,
            };
        }

        // Review/extraction
        if (goal.includes('review') || goal.includes('extraction') || goal.includes('accept') || goal.includes('reject')) {
            return {
                type: 'review',
                path: 'review',
                operator: 'exists',
            };
        }

        // Confirmation/publishing
        if (goal.includes('publish') || goal.includes('confirm') || goal.includes('gate')) {
            return {
                type: 'confirmation',
                path: 'pendingConfirmations',
                operator: 'exists',
            };
        }

        // Default: note exists
        return {
            type: 'note',
            path: 'note.id',
            operator: 'exists',
        };
    }

    private inferConstraints(goal: string): GoalConstraints {
        const constraints: GoalConstraints = {};

        if (goal.includes('private')) constraints.privacy = 'private';
        else if (goal.includes('public')) constraints.privacy = 'public';
        else constraints.privacy = 'any';

        if (goal.includes('confirm') || goal.includes('gate') || goal.includes('publish')) {
            constraints.requireConfirmation = true;
        }

        // Extract max steps if mentioned
        const stepsMatch = goal.match(/(?:in|within)\s+(\d+)\s+steps?/i);
        if (stepsMatch) {
            constraints.maxSteps = parseInt(stepsMatch[1], 10);
        }

        return constraints;
    }

    private inferActions(
        goal: string,
        actions: Array<{ component: string; action: string; selector: any; intent: string }>,
        targetState: TargetStatePredicate
    ): InferredAction[] {
        const inferred: InferredAction[] = [];

        // Map goal keywords to actions
        const actionMap: Record<string, string[]> = {
            'capture': ['note.capture', 'note.create'],
            'create': ['note.create'],
            'edit': ['note.edit', 'note.updateContent'],
            'add': ['note.addProperty', 'note.insertProperty'],
            'property': ['note.addProperty', 'note.insertProperty'],
            'detail': ['note.addProperty', 'note.insertProperty'],
            'delete': ['note.delete', 'note.removeProperty'],
            'remove': ['note.removeProperty'],
            'publish': ['note.publish'],
            'accept': ['note.acceptExtraction'],
            'reject': ['note.rejectExtraction'],
            'select': ['note.select'],
            'navigate': ['note.select'],
        };

        // Find matching actions
        const matchedIntents = new Set<string>();
        for (const [keyword, intents] of Object.entries(actionMap)) {
            if (goal.includes(keyword)) {
                for (const intent of intents) {
                    matchedIntents.add(intent);
                }
            }
        }

        // If target state is property, ensure addProperty action
        if (targetState.type === 'property') {
            matchedIntents.add('note.addProperty');
            matchedIntents.add('note.insertProperty');
        }

        // If target state is confirmation, ensure publish action
        if (targetState.type === 'confirmation') {
            matchedIntents.add('note.publish');
        }

        // Map intents to discovered actions
        for (const intent of matchedIntents) {
            const action = actions.find(a => a.intent === intent);
            if (action) {
                inferred.push({
                    intent: action.intent,
                    component: action.component,
                    action: action.action,
                    selector: action.selector,
                });
            }
        }

        // Add navigation if needed
        if (targetState.type === 'note' || targetState.type === 'property') {
            const navAction = actions.find(a => a.intent === 'note.select');
            if (navAction && !inferred.some(a => a.intent === 'note.select')) {
                inferred.unshift({
                    intent: 'note.select',
                    component: navAction.component,
                    action: navAction.action,
                    selector: navAction.selector,
                });
            }
        }

        return inferred;
    }
}

export const goalParser = new GoalParser();