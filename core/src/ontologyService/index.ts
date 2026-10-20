/**
 * Ontology Service Utilities
 * 
 * Modular utilities for ontology operations:
 * - widgets: Widget metadata generation
 * - statistics: Usage and co-occurrence tracking
 * - matching: Fuzzy matching utilities
 * - index: Attribute index building
 * - recording: Usage recording
 * - analysis: Frequency and co-occurrence analysis
 * - graph: Graph data building
 */

export {
    type WidgetType,
    type WidgetMetadata,
    buildWidgetMetadata,
    getAttributesByOperator,
    getEnumOptions,
    getAttributesByType,
    getValidOperators
} from './widgets.js';

export {
    type SuggestedAttribute,
    UsageTracker
} from './statistics.js';

export {
    FuzzyMatcher
} from './matching.js';

export {
    buildAttributeIndex
} from './AttributeIndexBuilder.js';

export {
    UsageRecorder
} from './UsageRecorder.js';

export {
    CoOccurrenceRecorder
} from './CoOccurrenceRecorder.js';

export {
    FrequencyAnalyzer
} from './FrequencyAnalyzer.js';

export {
    CoOccurrenceAnalyzer
} from './CoOccurrenceAnalyzer.js';

export {
    GraphDataBuilder
} from './GraphDataBuilder.js';
