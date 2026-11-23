import {describe, expect, it} from 'vitest';
import {createNote} from '@notention/core';
import {groupByStatus, selectIndex} from '../../utils/noteIndex';

const note = (overrides: Parameters<typeof createNote>[0]) => createNote(overrides);

const notes = [
    note({
        id: 'a',
        title: 'Alpha',
        updatedAt: '2026-01-03T00:00:00.000Z',
        properties: [{key: 'status', operator: 'is', values: ['todo']}],
    }),
    note({
        id: 'b',
        title: 'Beta',
        updatedAt: '2026-01-02T00:00:00.000Z',
        properties: [{key: 'status', operator: 'is', values: ['done']}],
    }),
    note({
        id: 'c',
        title: 'Gamma',
        updatedAt: '2026-01-01T00:00:00.000Z',
        tags: ['task'],
    }),
    note({id: 'd', title: 'Delta', updatedAt: '2025-12-31T00:00:00.000Z'}),
    note({id: 'e', title: 'Deleted', deletedAt: '2026-01-04T00:00:00.000Z'}),
];

describe('selectIndex', () => {
    it('excludes trash and sorts the visible subset by updated time', () => {
        const index = selectIndex(notes, {
            subset: 'all',
            arrangement: 'list',
            order: 'updatedAt_desc',
        });

        expect(index.items.map(item => item.id)).toEqual(['a', 'b', 'c', 'd']);
        expect(index.counts).toEqual({all: 4, tasks: 2, tags: 1, trash: 1});
        expect(index.hidden).toBe(1);
    });

    it('keeps only tasks and tags when those subsets are active', () => {
        const tasks = selectIndex(notes, {subset: 'tasks', arrangement: 'list', order: 'updatedAt_desc'});
        const tags = selectIndex(notes, {subset: 'tags', arrangement: 'list', order: 'updatedAt_desc'});

        expect(tasks.items.map(item => item.id)).toEqual(['a', 'c']);
        expect(tags.items.map(item => item.id)).toEqual(['c']);
    });

    it('shows only deleted notes for the trash subset', () => {
        const index = selectIndex(notes, {subset: 'trash', arrangement: 'list', order: 'updatedAt_desc'});

        expect(index.items.map(item => item.id)).toEqual(['e']);
    });

    it('filters by the active query without losing counts', () => {
        const index = selectIndex(notes, {
            subset: 'all',
            arrangement: 'list',
            order: 'updatedAt_desc',
            query: 'beta',
        });

        expect(index.items.map(item => item.id)).toEqual(['b']);
        expect(index.counts.all).toBe(4);
    });

    it('only groups a board by status', () => {
        const list = selectIndex(notes, {subset: 'all', arrangement: 'list', order: 'updatedAt_desc', group: 'status'});
        const board = selectIndex(notes, {subset: 'all', arrangement: 'board', order: 'updatedAt_desc', group: 'status'});

        expect(list.groups).toEqual([]);
        expect(board.groups.map(group => group.id)).toEqual(['todo', 'done', 'unscheduled']);
    });
});

describe('groupByStatus', () => {
    it('orders known statuses, then unknown statuses, then no status', () => {
        const groups = groupByStatus([
            note({id: 'none'}),
            note({id: 'weird', properties: [{key: 'status', operator: 'is', values: ['paused']}]}),
            note({id: 'done', properties: [{key: 'status', operator: 'is', values: ['done']}]}),
            note({id: 'todo', properties: [{key: 'status', operator: 'is', values: ['TODO']}]}),
        ]);

        expect(groups.map(group => group.id)).toEqual(['todo', 'done', 'paused', 'unscheduled']);
        expect(groups.map(group => group.label)).toEqual(['todo', 'done', 'paused', 'No status']);
    });
});
