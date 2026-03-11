/**
 * Ontology Service Utilities
 * 
 * Modular utilities for ontology operations:
 * - widgets: Widget metadata generation
 * - statistics: Usage and co-occurrence tracking
 * - matching: Fuzzy matching utilities
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
