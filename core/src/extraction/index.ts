export { 
    alignToOntology, 
    explainAlignment, 
    type AlignmentExplanation 
} from './ExtractionPipeline.js';

export {
    ExtractionPipeline,
    createExtractionPipeline,
    defaultStages,
    type ExtractionStage,
    type ExtractionStageName,
    type ExtractionContext,
    type ExtractionOptions,
    type ExtractionResult,
    type ExtractionExplanation,
    type AIExtractionProvider,
    DeterministicStage,
    PatternStage,
    OntologyKeyStage,
    FuzzyStage,
    AIStage,
} from './ExtractionPipeline.js';