import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MetaphorViewPlugin, getMetaphorViewForNote} from './MetaphorViewPlugin.js';
import {ConditionalAutomationView} from './ConditionalAutomationView.js';

describe('MetaphorViewPlugin', () => {
    let plugin: MetaphorViewPlugin;

    beforeEach(() => {
        plugin = new MetaphorViewPlugin();
    });

    it('registers and retrieves metaphor views', () => {
        const TestView = ({note}: {note: any}) => <div data-testid="test-view">{note.title}</div>;

        plugin.registerView('test-metaphor', TestView);
        const view = plugin.getViewForMetaphor('test-metaphor');

        expect(view).toBe(TestView);
    });

    it('returns undefined for unknown metaphor', () => {
        const view = plugin.getViewForMetaphor('unknown-metaphor');
        expect(view).toBeUndefined();
    });

    it('provides default view for registered metaphors', () => {
        const view = plugin.getViewForMetaphor('conditional-automation');
        expect(view).toBe(ConditionalAutomationView);
    });

    it('getMetaphorViewForNote returns correct view for conditional-automation note', () => {
        const note = {
            id: '1',
            title: 'Test Automation',
            content: '',
            properties: [
                {key: 'metaphor', operator: 'is', values: ['conditional-automation']},
                {key: 'if', operator: 'is', values: ['condition']},
                {key: 'then', operator: 'is', values: ['action']},
            ],
            tags: ['automation'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const view = getMetaphorViewForNote(note);
        expect(view).toBe(ConditionalAutomationView);
    });

    it('getMetaphorViewForNote returns undefined for note without metaphor', () => {
        const note = {
            id: '1',
            title: 'Regular Note',
            content: '',
            properties: [{key: 'status', operator: 'is', values: ['todo']}],
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const view = getMetaphorViewForNote(note);
        expect(view).toBeUndefined();
    });

    it('ConditionalAutomationView renders IF/THEN structure', () => {
        const note = {
            id: '1',
            title: 'Test Rule',
            content: 'When X then Y',
            properties: [
                {key: 'metaphor', operator: 'is', values: ['conditional-automation']},
                {key: 'if', operator: 'is', values: ['temperature > 30']},
                {key: 'condition', operator: 'is', values: ['humidity high']},
                {key: 'when', operator: 'is', values: ['daytime']},
                {key: 'then', operator: 'is', values: ['turn on AC']},
                {key: 'do', operator: 'is', values: ['send notification']},
                {key: 'action', operator: 'is', values: ['log event']},
                {key: 'frequency', operator: 'is', values: ['continuous']},
            ],
            tags: ['automation', 'climate'],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        render(<ConditionalAutomationView note={note} />);

        expect(screen.getByText('Test Rule')).toBeInTheDocument();
        expect(screen.getByText('When X then Y')).toBeInTheDocument();

        // Check conditions
        expect(screen.getByText('temperature > 30')).toBeInTheDocument();
        expect(screen.getByText('humidity high')).toBeInTheDocument();
        expect(screen.getByText('daytime')).toBeInTheDocument();

        // Check actions
        expect(screen.getByText('turn on AC')).toBeInTheDocument();
        expect(screen.getByText('send notification')).toBeInTheDocument();
        expect(screen.getByText('log event')).toBeInTheDocument();

        // Check frequency badge
        expect(screen.getByText('Continuous')).toBeInTheDocument();
    });

    it('ConditionalAutomationView shows empty state for note without rules', () => {
        const note = {
            id: '1',
            title: 'Empty Rule',
            content: '',
            properties: [
                {key: 'metaphor', operator: 'is', values: ['conditional-automation']},
            ],
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        render(<ConditionalAutomationView note={note} />);

        expect(screen.getByText('No rules defined yet')).toBeInTheDocument();
        expect(screen.getByText('Add [@if:condition] and [@then:action] properties')).toBeInTheDocument();
    });
});