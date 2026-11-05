import type { CandidateStrategy } from '../spec/index.js';
import type { GateResult } from '../gates.js';

export function runImportAllowlistGate(candidate: CandidateStrategy): GateResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const allowlist = [
        'react',
        'react-dom',
        '@notention/ui',
        '@notention/core',
        'zod',
        'date-fns',
        '@notention/ai',
    ];

    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(candidate.code)) !== null) {
        const importPath = match[1];
        const isAllowed = allowlist.some(allowed => importPath.startsWith(allowed));
        if (!isAllowed && !importPath.startsWith('.')) {
            if (!importPath.startsWith('.')) {
                errors.push(`Disallowed import: ${importPath} (not in allowlist)`);
            }
        }
    }

    return { pass: errors.length === 0, errors, warnings };
}