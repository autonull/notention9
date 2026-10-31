export { 
    ingestCorpus, 
    loadCorpusTestCases,
    type CorpusConfig,
    type CorpusAnalysis,
    type ExtractedTerm,
} from './ingest.js';

export type { ExtractionTestCase as TestCase, MatchTestCase } from '../synthesis/testCases.js';