/**
 * Friction recording hook for UI components
 * Provides easy instrumentation for the 7 friction event kinds
 */

import { useCallback, useRef, useEffect } from 'react';
import { recordFriction, type FrictionKind, type DurationBucket } from '@notention/core/telemetry/journal';

/**
 * Duration bucket for friction events
 */
export function getDurationBucket(startTime: number): DurationBucket {
    const elapsed = Date.now() - startTime;
    if (elapsed < 5_000) return '<5s';
    if (elapsed < 15_000) return '5-15s';
    if (elapsed < 60_000) return '15-60s';
    return '>60s';
}

/**
 * Hook for recording friction events with automatic duration tracking
 */
export function useFrictionRecorder(workflow: string, seam: string) {
    const startTimes = useRef<Map<FrictionKind, number>>(new Map());

    /**
     * Record a friction event with optional duration tracking
     */
    const record = useCallback((kind: FrictionKind, options?: { durationBucket?: DurationBucket; count?: number }) => {
        const startTime = startTimes.current.get(kind);
        const durationBucket = options?.durationBucket ?? (startTime ? getDurationBucket(startTime) : undefined);
        
        recordFriction({
            workflow,
            seam,
            kind,
            count: options?.count ?? 1,
            durationBucket,
        });
        
        // Clear start time after recording (for non-continuous events)
        if (kind !== 'capture_started' && kind !== 'match_viewed') {
            startTimes.current.delete(kind);
        }
    }, [workflow, seam]);

    /**
     * Mark the start of a continuous event (like capture or match viewing)
     */
    const markStart = useCallback((kind: FrictionKind) => {
        startTimes.current.set(kind, Date.now());
    }, []);

    /**
     * Record capture_started event
     */
    const recordCaptureStarted = useCallback(() => {
        markStart('capture_started');
        record('capture_started');
    }, [markStart, record]);

    /**
     * Record capture_abandoned event
     */
    const recordCaptureAbandoned = useCallback(() => {
        record('capture_abandoned');
    }, [record]);

    /**
     * Record correction event
     */
    const recordCorrection = useCallback(() => {
        record('correction');
    }, [record]);

    /**
     * Record match_viewed event
     */
    const recordMatchViewed = useCallback(() => {
        markStart('match_viewed');
        record('match_viewed');
    }, [markStart, record]);

    /**
     * Record match_rejected event
     */
    const recordMatchRejected = useCallback(() => {
        record('match_rejected');
    }, [record]);

    /**
     * Record match_accepted event
     */
    const recordMatchAccepted = useCallback(() => {
        record('match_accepted');
    }, [record]);

    /**
     * Record clarification_requested event
     */
    const recordClarificationRequested = useCallback(() => {
        record('clarification_requested');
    }, [record]);

    return {
        record,
        recordCaptureStarted,
        recordCaptureAbandoned,
        recordCorrection,
        recordMatchViewed,
        recordMatchRejected,
        recordMatchAccepted,
        recordClarificationRequested,
    };
}

/**
 * Hook for tracking capture input lifecycle
 * Call startCaptureTracking when input is focused
 * Call stopCaptureTracking when input is blurred or submitted
 */
export function useCaptureTracking(workflow: string = 'capture', seam: string = 'capture') {
    const { recordCaptureStarted, recordCaptureAbandoned } = useFrictionRecorder(workflow, seam);
    const hasStarted = useRef(false);
    const hasSubmitted = useRef(false);

    const startTracking = useCallback(() => {
        if (!hasStarted.current) {
            hasStarted.current = true;
            hasSubmitted.current = false;
            recordCaptureStarted();
        }
    }, [recordCaptureStarted]);

    const stopTracking = useCallback((submitted: boolean) => {
        if (hasStarted.current && !hasSubmitted.current && !submitted) {
            recordCaptureAbandoned();
        }
        hasSubmitted.current = submitted;
        hasStarted.current = false;
    }, [recordCaptureAbandoned]);

    const markSubmitted = useCallback(() => {
        hasSubmitted.current = true;
    }, []);

    // Reset on unmount
    useEffect(() => {
        return () => {
            if (hasStarted.current && !hasSubmitted.current) {
                recordCaptureAbandoned();
            }
        };
    }, [recordCaptureAbandoned]);

    return { startTracking, stopTracking, markSubmitted };
}

/**
 * Hook for tracking match view lifecycle
 */
export function useMatchTracking(workflow: string = 'match', seam: string = 'match') {
    const { recordMatchViewed, recordMatchAccepted, recordMatchRejected, recordClarificationRequested } = 
        useFrictionRecorder(workflow, seam);
    const hasViewed = useRef(false);

    const markViewed = useCallback(() => {
        if (!hasViewed.current) {
            hasViewed.current = true;
            recordMatchViewed();
        }
    }, [recordMatchViewed]);

    const handleAccept = useCallback((type: 'request' | 'match' = 'match') => {
        recordMatchAccepted();
    }, [recordMatchAccepted]);

    const handleReject = useCallback(() => {
        recordMatchRejected();
    }, [recordMatchRejected]);

    const handleClarification = useCallback(() => {
        recordClarificationRequested();
    }, [recordClarificationRequested]);

    return { markViewed, handleAccept, handleReject, handleClarification };
}