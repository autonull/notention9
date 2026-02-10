import React from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {SmartNoteAssistant} from "@/components/SmartNoteAssistant";
import {SettingsProvider} from "@/components/contexts/SettingsContext";
import {ToastProvider} from "@/components/contexts/ToastProvider";
import {Note} from '@notention/core';

// Mock contexts
const MockProviders = ({children}: { children: React.ReactNode }) => (
    <SettingsProvider>
        <ToastProvider>
            {children}
        </ToastProvider>
    </SettingsProvider>
);

describe('SmartNoteAssistant', () => {
    it('renders simplified labels', async () => {
        const note: Note = {
            id: 'test-note',
            title: 'Test',
            content: 'need to buy milk',
            type: 'note',
            properties: [],
            created_at: Date.now(),
            modified_at: Date.now(),
            tags: [],
            stats: {viewCount: 0, readTime: 0}
        };

        render(
            <MockProviders>
                <SmartNoteAssistant note={note} onNoteUpdate={() => {
                }}/>
            </MockProviders>
        );

        // Wait for async analysis (debounce is 1000ms, so we need >1000ms timeout)
        await expect(screen.findByText(/Suggestion/, {}, {timeout: 3000})).resolves.toBeInTheDocument();

        // Check for the toggle button (it might be "Hide" if auto-shown, or "Show" if not)
        // The new logic auto-shows if suggestions > 0
        await expect(screen.findByText(/Hide|Show/)).resolves.toBeInTheDocument();

        // Verify removed texts are gone
        expect(screen.queryByText('Smart Assistant')).not.toBeInTheDocument();
    });
});
