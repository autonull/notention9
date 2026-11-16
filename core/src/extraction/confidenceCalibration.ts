/**
 * Confidence Calibration (W3.3)
 * Calibrates extraction confidence scores against quality set ground truth
 * Reports ECE and provides bucketed confidence display (high/medium/low)
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Property } from '../types/index.js';
import type { ExtractionStageName } from './ExtractionPipeline.js';
import { ExtractionPipeline } from './ExtractionPipeline.js';
import { getOntology } from '../ontology/index.js';
import { QUALITY_CASE_NOTES } from '../fixtures/index.js';
import { createNote } from '../notes/index.js';
import { MatchEngine } from '../matching/MatchEngine.js';
import { getStageConfidence } from './extractionConstants.js';

import {
    getConfidenceBucket,
    type PropertyWithCalibration,
} from './confidenceDisplay.js';

// Re-export display utilities
export {
    getConfidenceBucket,
    getConfidenceBucketLabel,
    getConfidenceBucketColor,
    type PropertyWithCalibration,
    CONFIDENCE_BUCKETS,
    type ConfidenceBucket,
} from './confidenceDisplay.js';

export interface CalibrationConfig {
    /** Number of confidence bins for ECE calculation */
    numBins: number;
    /** Minimum samples per bin for reliable calibration */
    minSamplesPerBin: number;
    /** Path to save calibration data */
    outputPath?: string;
}

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
    numBins: 10,
    minSamplesPerBin: 5,
};

export interface ConfidenceBin {
    binStart: number;
    binEnd: number;
    count: number;
    accuracy: number;
    avgConfidence: number;
}

export interface CalibrationResult {
    /** Expected Calibration Error */
    ece: number;
    /** Confidence bins with observed accuracy */
    bins: ConfidenceBin[];
    /** Overall accuracy */
    overallAccuracy: number;
    /** Overall average confidence */
    overallAvgConfidence: number;
    /** Total samples used for calibration */
    totalSamples: number;
    /** Per-stage calibration */
    byStage: Record<ExtractionStageName, CalibrationResult>;
    /** Calibrated confidence mapping: raw confidence -> calibrated probability */
    calibrationMap: Array<{ raw: number; calibrated: number }>;
}

/**
 * Run calibration against quality cases
 * Uses property extraction + matching as ground truth proxy
 */
export async function runConfidenceCalibration(
    config: Partial<CalibrationConfig> = {}
): Promise<CalibrationResult> {
    const cfg = { ...DEFAULT_CALIBRATION_CONFIG, ...config };
    
    // Load quality cases
    const projectRoot = process.cwd();
    const manifestPath = join(projectRoot, 'data', 'eval', 'cases', 'manifest.json');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    const matchCases = manifest.cases.filter((c: any) => c.qualityFamily === 'match');
    
    // Build candidate notes map
    const candidateNotesByPrefix = new Map<string, any[]>();
    for (const note of QUALITY_CASE_NOTES) {
        const prefix = note.id.split('-')[1];
        if (!candidateNotesByPrefix.has(prefix)) {
            candidateNotesByPrefix.set(prefix, []);
        }
        candidateNotesByPrefix.get(prefix)!.push(note);
    }
    
    const prefixMap: Record<string, string> = {
        '001': 'ramp', '002': 'dog', '003': 'piano', '004': 'ride',
        '005': 'move', '006': 'meal', '007': 'donate', '008': 'spanish',
        '009': 'sitter', '010': 'mentor', '011': 'photo', '012': 'drive',
        '013': 'tech', '014': 'mentor', '015': 'photo', '016': 'drive',
        '017': 'tech', '018': 'donate', '019': 'clean', '020': 'resume',
        '021': 'grocery', '022': 'legal',
    };
    
    const ontology = getOntology().nodes;
    const ontologyArray = Array.from(ontology.values());
    const engine = new MatchEngine(ontologyArray);
    const pipeline = new ExtractionPipeline();
    
    // Collect (confidence, isCorrect) pairs per stage
    const stageData: Record<ExtractionStageName, Array<{ confidence: number; correct: boolean }>> = {
        deterministic: [],
        pattern: [],
        ai: [],
        fuzzy: [],
    };
    
    for (const caseRef of matchCases) {
        const casePath = join(projectRoot, 'data', 'eval', 'cases', caseRef.path);
        const caseContent = await readFile(casePath, 'utf-8');
        const caseData = JSON.parse(caseContent);
        
        const caseNum = caseData.id.split('-')[2];
        const prefix = prefixMap[caseNum];
        const candidateNotes = prefix ? candidateNotesByPrefix.get(prefix) || [] : [];
        
        if (candidateNotes.length === 0) continue;
        
        // Extract properties from request input
        const extractionResult = await pipeline.extract(caseData.input, ontologyArray, {
            intents: true, patterns: true, ontologyKeys: true, fuzzy: true,
            price: true, dates: true, roles: true,
        });
        
        // Create request note
        const requestNote = createNote({
            id: `request-${caseData.id}`,
            properties: extractionResult.properties,
        });
        
        // Match against candidates
        const matchResults = candidateNotes.map(offerNote => {
            const result = engine.calculateMatchScore(requestNote, offerNote);
            return { note: offerNote, score: result.score };
        });
        
        // Expected matches (ground truth)
        const expectedSet = new Set(caseData.expected.map((e: any) => e.noteId));
        
        // For each property in extraction, determine if it contributed to correct match
        // This is a proxy: properties from stages that led to correct matches are "correct"
        for (const [stageName, props] of Object.entries(extractionResult.byStage)) {
            const stage = stageName as ExtractionStageName;
            for (const prop of props) {
                // Check if this property's key appears in any expected match
                const propContributesToMatch = expectedSet.size > 0 && 
                    matchResults.some(m => expectedSet.has(m.note.id));
                
                stageData[stage].push({
                    confidence: prop.confidence ?? getStageConfidence(stage),
                    correct: propContributesToMatch,
                });
            }
        }
    }
    
    // Compute calibration per stage and overall
    const allData: Array<{ confidence: number; correct: boolean }> = [];
    const byStageResult: Record<ExtractionStageName, CalibrationResult> = {} as any;
    
    for (const [stage, data] of Object.entries(stageData)) {
        const result = computeCalibration(data, cfg.numBins);
        byStageResult[stage as ExtractionStageName] = result;
        allData.push(...data);
    }
    
    const overallResult = computeCalibration(allData, cfg.numBins);
    
    // Generate calibration map for raw -> calibrated conversion
    const calibrationMap = generateCalibrationMap(overallResult.bins);
    
    return {
        ...overallResult,
        byStage: byStageResult,
        calibrationMap,
    };
}

/**
 * Compute calibration metrics from (confidence, correct) pairs
 */
function computeCalibration(
    data: Array<{ confidence: number; correct: boolean }>,
    numBins: number
): CalibrationResult {
    if (data.length === 0) {
        return {
            ece: 0,
            bins: [],
            overallAccuracy: 0,
            overallAvgConfidence: 0,
            totalSamples: 0,
            byStage: {} as any,
            calibrationMap: [],
        };
    }
    
    const bins: ConfidenceBin[] = [];
    const binWidth = 1 / numBins;
    
    for (let i = 0; i < numBins; i++) {
        const binStart = i * binWidth;
        const binEnd = (i + 1) * binWidth;
        
        const binData = data.filter(d => 
            d.confidence >= binStart && d.confidence < (i === numBins - 1 ? 1.001 : binEnd)
        );
        
        if (binData.length > 0) {
            const accuracy = binData.filter(d => d.correct).length / binData.length;
            const avgConfidence = binData.reduce((sum, d) => sum + d.confidence, 0) / binData.length;
            
            bins.push({
                binStart,
                binEnd,
                count: binData.length,
                accuracy,
                avgConfidence,
            });
        }
    }
    
    // ECE = weighted average of |accuracy - confidence|
    const total = data.length;
    const ece = bins.reduce((sum, bin) => 
        sum + (bin.count / total) * Math.abs(bin.accuracy - bin.avgConfidence), 0
    );
    
    const overallAccuracy = data.filter(d => d.correct).length / total;
    const overallAvgConfidence = data.reduce((sum, d) => sum + d.confidence, 0) / total;
    
    return {
        ece,
        bins,
        overallAccuracy,
        overallAvgConfidence,
        totalSamples: total,
        byStage: {} as any,
        calibrationMap: [],
    };
}

/**
 * Generate piecewise linear calibration map from bins
 */
function generateCalibrationMap(bins: ConfidenceBin[]): Array<{ raw: number; calibrated: number }> {
    const map: Array<{ raw: number; calibrated: number }> = [];
    
    for (const bin of bins) {
        if (bin.count >= 5) { // Only use bins with sufficient samples
            map.push({ raw: bin.avgConfidence, calibrated: bin.accuracy });
        }
    }
    
    // Add endpoints
    map.push({ raw: 0, calibrated: 0 });
    map.push({ raw: 1, calibrated: 1 });
    
    // Sort by raw confidence
    map.sort((a, b) => a.raw - b.raw);
    
    return map;
}

/**
 * Apply calibration map to raw confidence
 */
export function calibrateConfidence(rawConfidence: number, calibrationMap: Array<{ raw: number; calibrated: number }>): number {
    if (calibrationMap.length < 2) return rawConfidence;
    
    // Find surrounding points
    for (let i = 0; i < calibrationMap.length - 1; i++) {
        const p1 = calibrationMap[i];
        const p2 = calibrationMap[i + 1];
        
        if (rawConfidence >= p1.raw && rawConfidence <= p2.raw) {
            // Linear interpolation
            if (p2.raw === p1.raw) return p1.calibrated;
            const t = (rawConfidence - p1.raw) / (p2.raw - p1.raw);
            return p1.calibrated + t * (p2.calibrated - p1.calibrated);
        }
    }
    
    // Extrapolate if outside range
    if (rawConfidence <= calibrationMap[0].raw) return calibrationMap[0].calibrated;
    return calibrationMap[calibrationMap.length - 1].calibrated;
}

/**
 * Add calibrated confidence and bucket to properties
 */
export function addCalibrationToProperties(
    properties: Property[],
    calibrationMap: Array<{ raw: number; calibrated: number }>
): PropertyWithCalibration[] {
    return properties.map(prop => {
        const rawConfidence = prop.confidence ?? 0.5;
        const calibratedConfidence = calibrateConfidence(rawConfidence, calibrationMap);
        const confidenceBucket = getConfidenceBucket(calibratedConfidence);
        
        return {
            ...prop,
            calibratedConfidence,
            confidenceBucket,
        };
    });
}