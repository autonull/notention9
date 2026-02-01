/**
 * Example: Complete Ontology-Driven Integration
 * 
 * Demonstrates end-to-end flow from natural language to skill execution.
 */

import {
    OntologyService,
    PropertyExtractor,
    QueryBuilder,
    SkillPatternMatcher,
    SkillApprovalManager,
    SkillExecutor,
    SkillDefinition,
    DEFAULT_ONTOLOGY
} from '@notention/core';

// Initialize services
const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);
const propertyExtractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const queryBuilder = new QueryBuilder(DEFAULT_ONTOLOGY);

// Initialize skill system
const skillMatcher = new SkillPatternMatcher(DEFAULT_ONTOLOGY);
const approvalManager = new SkillApprovalManager(async (skill, match, reason) => {
    console.log(`[Approval Request] ${reason}`);
    return true; // Auto-approve for demo
});
const skillExecutor = new SkillExecutor(skillMatcher, approvalManager, ontologyService);

// Register sample skill
const indeedSkill: SkillDefinition = {
    id: 'indeed-adapter',
    name: 'Indeed Job Search',
    description: 'Search for jobs on Indeed',
    semanticPattern: {
        requiresAny: [
            { attributeType: 'string', keySimilarTo: ['role', 'job', 'position'] },
            { attributeType: 'string', keySimilarTo: ['location', 'city', 'place'] }
        ]
    },
    exportMapping: { role: 'q', location: 'l', salary: 'salary' },
    importMapping: {
        'title': 'role',
        'company': 'organization',
        'location': 'location',
        'salary': 'salary'
    },
    execute: async (properties) => {
        const role = properties.find(p => p.key === 'role')?.values[0] || '';
        const location = properties.find(p => p.key === 'location')?.values[0] || '';
        console.log(`[Indeed] Searching: ${role} in ${location}`);

        // Simulate API results
        return [
            { title: 'Senior Engineer', company: 'TechCorp', location: 'Boston', salary: '150k' },
            { title: 'Software Developer', company: 'StartupXYZ', location: 'Boston', salary: '120k' }
        ];
    }
};

skillMatcher.registerSkill(indeedSkill);

// Example 1: Natural Language → Properties → Note
async function example1_NLPToNote() {
    console.log('\n=== Example 1: NLP to Note ===');

    const userInput = "find engineer jobs near Boston";
    const properties = propertyExtractor.extractFromText(userInput);

    console.log('Extracted properties:', properties);

    const validation = queryBuilder.validateQuery(properties);
    console.log('Validation:', validation.valid ? '✓ Valid' : '✗ Invalid', validation.errors);

    const note = {
        id: 'note-1',
        title: userInput,
        content: '',
        tags: [],
        properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        public: false
    };

    return note;
}

// Example 2: Note → Skill Matching → Execution
async function example2_SkillExecution() {
    console.log('\n=== Example 2: Skill Execution ===');

    const note = await example1_NLPToNote();

    const matches = skillMatcher.matchSkills(note);
    console.log('Skill matches:', matches.map(m => `${m.skill.name} (${m.confidence}%)`));

    skillExecutor.setResultCallback((resultNotes, sourceNote, skill) => {
        console.log(`[Results] ${skill.name} returned ${resultNotes.length} notes`);
        resultNotes.forEach(n => console.log(`  - ${n.title}`));
    });

    const results = await skillExecutor.processNote(note);
    console.log('Execution results:', results.map(r => r.success ? '✓' : '✗'));
}

// Example 3: Widget Generation from Ontology
async function example3_WidgetGeneration() {
    console.log('\n=== Example 3: Widget Generation ===');

    const attributes = ['channel', 'role', 'salary', 'startDateTime'];

    for (const attr of attributes) {
        const metadata = ontologyService.getWidgetMetadata(attr);
        console.log(`${attr}:`, {
            widget: metadata?.type,
            options: metadata?.options?.slice(0, 3),
            operators: metadata?.operators.slice(0, 2)
        });
    }
}

// Run all examples
async function runExamples() {
    await example1_NLPToNote();
    await example2_SkillExecution();
    await example3_WidgetGeneration();

    console.log('\n✅ All examples completed!');
}

// Export for use
export { runExamples };

// Run if executed directly
if (require.main === module) {
    runExamples().catch(console.error);
}
