/**
 * Confidence Calibration - Browser Stub
 * Re-exports only UI-safe utilities from confidenceDisplay.ts
 * The full calibration CLI lives in confidenceCalibration.ts (Node.js only)
 */

export {
    getConfidenceBucket,
    getConfidenceBucketLabel,
    getConfidenceBucketColor,
    type PropertyWithCalibration,
    CONFIDENCE_BUCKETS,
    type ConfidenceBucket,
} from './confidenceDisplay.js';

// Node-only functions - not available in browser
export const runConfidenceCalibration = async () => {
    throw new Error('runConfidenceCalibration is Node.js only. Use pnpm optimize eval:confidence');
};

export const calibrateConfidence = () => {
    throw new Error('calibrateConfidence is Node.js only');
};

export const addCalibrationToProperties = () => {
    throw new Error('addCalibrationToProperties is Node.js only');
};

export const DEFAULT_CALIBRATION_CONFIG = {
    numBins: 10,
    minSamplesPerBin: 5,
};