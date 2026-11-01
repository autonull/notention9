/**
 * Browser-safe stub for verdict
 * Evaluation infrastructure is Node.js only
 */

export function pairedTTest(): never {
    throw new Error('pairedTTest is only available in Node.js');
}

export function mean(): never {
    throw new Error('mean is only available in Node.js');
}

export function std(): never {
    throw new Error('std is only available in Node.js');
}

export function pairedConfidenceInterval(): never {
    throw new Error('pairedConfidenceInterval is only available in Node.js');
}

export function evaluateExtraction(): never {
    throw new Error('evaluateExtraction is only available in Node.js');
}

export function evaluateMatch(): never {
    throw new Error('evaluateMatch is only available in Node.js');
}

export function computeCaseVerdict(): never {
    throw new Error('computeCaseVerdict is only available in Node.js');
}

export function computeRunVerdict(): never {
    throw new Error('computeRunVerdict is only available in Node.js');
}

// Types are still exported for type checking
export type { 
    RunResult, 
    PairedRunResult, 
    MetricVerdict, 
    FloorCheck, 
    CaseVerdict, 
    RunVerdict, 
    VerdictConfig 
} from './verdict.js';