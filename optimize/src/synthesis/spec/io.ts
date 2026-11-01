import type { CandidateDir, CandidateStrategy } from './types.js';

/**
 * Create a candidate directory for generated strategies
 */
export function createCandidateDir(root: string): CandidateDir {
    return {
        root,
        candidates: new Map(),
    };
}

/**
 * Save a candidate to the candidate directory
 */
export async function saveCandidate(dir: CandidateDir, candidate: CandidateStrategy): Promise<void> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');

    const candidateDir = join(dir.root, candidate.id);
    await mkdir(candidateDir, { recursive: true });

    await writeFile(
        join(candidateDir, 'spec.json'),
        JSON.stringify(candidate.spec, null, 2)
    );

    await writeFile(
        join(candidateDir, 'strategy.tsx'),
        candidate.code
    );

    await writeFile(
        join(candidateDir, 'provenance.json'),
        JSON.stringify(candidate.provenance, null, 2)
    );

    dir.candidates.set(candidate.id, candidate);
}

/**
 * Load all candidates from a directory
 */
export async function loadCandidates(root: string): Promise<CandidateDir> {
    const { readdir, readFile } = await import('fs/promises');
    const { join } = await import('path');

    const dir = createCandidateDir(root);

    try {
        const entries = await readdir(root, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const candidateDir = join(root, entry.name);
            const specFile = join(candidateDir, 'spec.json');
            const codeFile = join(candidateDir, 'strategy.tsx');
            const provFile = join(candidateDir, 'provenance.json');

            try {
                const [specContent, codeContent, provContent] = await Promise.all([
                    readFile(specFile, 'utf-8'),
                    readFile(codeFile, 'utf-8'),
                    readFile(provFile, 'utf-8'),
                ]);

                const candidate: CandidateStrategy = {
                    id: entry.name,
                    spec: JSON.parse(specContent),
                    code: codeContent,
                    provenance: JSON.parse(provContent),
                    createdAt: new Date().toISOString(),
                };

                dir.candidates.set(candidate.id, candidate);
            } catch {
                // Skip invalid candidates
            }
        }
    } catch {
        // Directory doesn't exist
    }

    return dir;
}