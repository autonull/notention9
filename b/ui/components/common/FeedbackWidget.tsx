import React, { useState } from 'react';
import type { Feedback } from '@notention/core';
import { IconButton } from './IconButton';

export interface FeedbackWidgetProps {
    entityId: string;
    entityType: Feedback['entityType'];
    onFeedback?: (feedback: Feedback) => void;
    compact?: boolean;
}

/**
 * FeedbackWidget allows users to provide feedback on system features.
 * 
 * Usage:
 * - Thumbs up/down for quick feedback
 * - Optional detailed feedback modal
 * - Integrates with FeedbackCollector for learning
 */
export function FeedbackWidget({
    entityId,
    entityType,
    onFeedback,
    compact = false
}: FeedbackWidgetProps) {
    const [feedbackGiven, setFeedbackGiven] = useState<number | null>(null);

    const submitFeedback = (value: number, context?: any) => {
        const feedback: Feedback = {
            id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityId,
            entityType,
            value,
            context,
            timestamp: Date.now()
        };

        setFeedbackGiven(value);
        onFeedback?.(feedback);

        // Auto-clear after 2 seconds
        setTimeout(() => setFeedbackGiven(null), 2000);
    };

    if (feedbackGiven !== null) {
        return (
            <div className="feedback-widget feedback-submitted">
                <span className="text-sm text-gray-500">
                    {feedbackGiven > 0 ? '✓ Thanks!' : '✓ Noted'}
                </span>
            </div>
        );
    }

    return (
        <div className={`feedback-widget ${compact ? 'compact' : ''}`}>
            <IconButton
                onClick={() => submitFeedback(1)}
                title="Helpful"
                variant="ghost"
                size="sm"
                className="hover:text-green-600"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
            </IconButton>

            <IconButton
                onClick={() => submitFeedback(-1)}
                title="Not helpful"
                variant="ghost"
                size="sm"
                className="hover:text-red-600"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
            </IconButton>
        </div>
    );
}
