import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackWidget } from '../../components/common/FeedbackWidget';

describe('FeedbackWidget', () => {
    it('renders feedback buttons', () => {
        render(<FeedbackWidget entityId="test-1" />);
        expect(screen.getByTitle('Helpful')).toBeTruthy();
        expect(screen.getByTitle('Not helpful')).toBeTruthy();
    });

    it('handles positive feedback', () => {
        const mockFeedback = vi.fn();
        render(<FeedbackWidget entityId="test-1" onFeedback={mockFeedback} />);

        fireEvent.click(screen.getByTitle('Helpful'));

        expect(mockFeedback).toHaveBeenCalledWith('positive', '');
        expect(screen.getByText('Thanks!')).toBeTruthy();
    });

    it('handles negative feedback', () => {
        const mockFeedback = vi.fn();
        render(<FeedbackWidget entityId="test-1" onFeedback={mockFeedback} />);

        fireEvent.click(screen.getByTitle('Not helpful'));

        expect(mockFeedback).toHaveBeenCalledWith('negative', '');
        expect(screen.getByText('Thanks!')).toBeTruthy();
    });

    it('opens comment modal', () => {
        render(<FeedbackWidget entityId="test-1" />);
        fireEvent.click(screen.getByTitle('Provide details'));
        expect(screen.getByText('Provide Feedback', { selector: 'h3' })).toBeTruthy();
    });
});
