/**
 * PublishErrorBanner - Displays publish error with retry action
 * Extracted from EditorManager for separation of concerns
 */
import React from 'react';
import {Button} from '../common/Button';

interface PublishErrorBannerProps {
    error: string;
    onRetry: () => void;
}

export function PublishErrorBanner({error, onRetry}: PublishErrorBannerProps) {
    return (
        <div
            data-testid="publish-error"
            className="flex flex-wrap items-center gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200"
        >
            <span>Publish failed: {error}</span>
            <Button size="xs" variant="secondary" onClick={onRetry}>
                Retry
            </Button>
        </div>
    );
}