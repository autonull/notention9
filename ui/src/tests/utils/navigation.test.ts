import {describe, expect, it} from 'vitest';
import {DEFAULT_ROUTE, LEGACY_REDIRECTS, parseRoute, routeToHash} from '../../utils/navigation';

describe('parseRoute', () => {
    it('defaults to the Notes workspace', () => {
        expect(parseRoute('')).toEqual(DEFAULT_ROUTE);
        expect(parseRoute('#unknown')).toEqual(DEFAULT_ROUTE);
    });

    it('reads note modes, filters, and overlay flags', () => {
        expect(parseRoute('#/notes?mode=map&filter=trash&capture=1&explore=1&search=1&chat=1')).toMatchObject({
            view: 'notes',
            mode: 'map',
            section: 'trash',
            capture: true,
            explore: true,
            search: true,
            chat: true,
        });
    });

    it('reads note detail tabs', () => {
        expect(parseRoute('#/notes/abc?tab=replies&chat=1')).toMatchObject({
            view: 'notes',
            noteId: 'abc',
            tab: 'replies',
            chat: true,
        });
    });

    it('reads settings tabs', () => {
        expect(parseRoute('#/settings/ontology')).toMatchObject({
            view: 'settings',
            settingsTab: 'ontology',
        });
    });

    it('redirects every legacy hash to a reachable home', () => {
        for (const hash of Object.keys(LEGACY_REDIRECTS)) {
            const route = parseRoute(`#${hash}`);
            expect(route.view).toBe(hash === 'labels' || hash === 'ontology' || hash === 'skills' || hash === 'simulator' ? 'settings' : 'notes');
            expect(routeToHash(route)).toMatch(/^#\/(notes|settings)/);
        }
    });

    it('round-trips a note detail route', () => {
        const route = {...DEFAULT_ROUTE, noteId: 'note-1', tab: 'matches' as const};
        expect(parseRoute(routeToHash(route))).toMatchObject(route);
    });
});
