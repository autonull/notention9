import type { OntologyAttribute } from '../types/index.js';
import { CoOccurrenceRecorder } from './CoOccurrenceRecorder.js';

/**
 * Builds graph data for visualization from usage statistics
 */
export class GraphDataBuilder {
    constructor(
        private readonly attributeIndex: Map<string, OntologyAttribute>,
        private readonly coOccurrenceRecorder: CoOccurrenceRecorder,
        private readonly usageRecorder: { getKnown(): Map<string, number> }
    ) {}

    getGraphData(): { nodes: Array<{ id: string; val: number; label: string; group: string }>; links: Array<{ source: string; target: string; value: number }> } {
        const stats = this.usageRecorder.getKnown();
        const nodes = Array.from(this.attributeIndex.entries()).map(([key, attr]) => ({
            id: key,
            val: stats.get(key) ?? 1,
            label: key,
            group: attr.type ?? 'unknown'
        }));

        const processedPairs = new Set<string>();
        const links = Array.from(this.coOccurrenceRecorder.getCoOccurrenceData().entries())
            .flatMap(([src, targets]) =>
                Array.from(targets.entries())
                    .filter(([target]) => {
                        const pairId = src < target ? `${src}-${target}` : `${target}-${src}`;
                        return !processedPairs.has(pairId) && processedPairs.add(pairId);
                    })
                    .map(([target, value]) => ({ source: src, target, value }))
            );

        return { nodes, links };
    }
}