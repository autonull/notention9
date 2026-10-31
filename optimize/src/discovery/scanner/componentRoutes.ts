import type { ComponentInfo, DiscoveredRoute, JSXElement } from './componentScanner.js';
import { ROUTING_COMPONENT_TAGS, LINK_COMPONENT_TAGS } from '../../constants.js';
import { traverseJsx } from './componentJsx.js';

export function analyzeRoutes(components: Map<string, ComponentInfo>): DiscoveredRoute[] {
    const routes: DiscoveredRoute[] = [];
    const routeComponents = new Map<string, { path: string; guards: string[] }>();

    for (const [compName, comp] of components) {
        for (const jsx of comp.jsx) {
            extractRoutesFromJsx(compName, jsx, routeComponents);
        }
    }

    for (const [path, info] of routeComponents) {
        routes.push({ path, component: info.path.split('/')[1] || 'Unknown', guards: info.guards });
    }

    // Fallback: detect View components
    for (const name of components.keys()) {
        if (name.endsWith('View')) {
            const path = `#${name.replace('View', '').toLowerCase()}`;
            if (!routes.some(r => r.path === path)) {
                routes.push({ path, component: name, guards: [] });
            }
        }
    }

    return routes;
}

function extractRoutesFromJsx(
    compName: string,
    jsx: JSXElement,
    routes: Map<string, { path: string; guards: string[] }>
): void {
    traverseJsx(jsx, (node) => {
        if (ROUTING_COMPONENT_TAGS.some(tag => node.tag === tag)) {
            const path = node.props.path || node.props.from;
            if (path) {
                const guards: string[] = [];
                if (node.props.guard) guards.push(node.props.guard);
                if (node.props.requireAuth) guards.push('auth');
                routes.set(path, { path, guards });
            }
        }

        if (LINK_COMPONENT_TAGS.some(tag => node.tag === tag) && node.props.to) {
            const path = node.props.to;
            routes.set(path, { path, guards: [] });
        }
    });
}