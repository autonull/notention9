import { calculateMatchScore } from '../core/dist/ontologyHelpers.js';

// Mock Note Factory
const createNote = (id, properties, priority) => ({
  id,
  title: 'Test Note',
  content: 'Content',
  tags: [],
  properties,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  public: false,
  priority: priority ?? 1.0,
  source: { type: 'user', identifier: 'test', timestamp: Date.now() }
});

const runVerification = () => {
  console.log('Verifying Weighted Matching...');

  const ontology = []; // Mock ontology, helper doesn't strictly need it for this calculation

  // Scenario:
  // Source Note: { skill: 'React' }
  // Target Note A: { skill: 'React' }, Priority 1.0
  // Target Note B: { skill: 'React' }, Priority 0.5

  const sourceNote = createNote('source', [{ key: 'skill', operator: 'is', values: ['React'] }], 1.0);
  const targetNoteA = createNote('targetA', [{ key: 'skill', operator: 'is', values: ['React'] }], 1.0);
  const targetNoteB = createNote('targetB', [{ key: 'skill', operator: 'is', values: ['React'] }], 0.5);

  const scoreA = calculateMatchScore(sourceNote, targetNoteA, ontology);
  const scoreB = calculateMatchScore(sourceNote, targetNoteB, ontology);

  console.log(`Score A (Priority 1.0): ${scoreA}`);
  console.log(`Score B (Priority 0.5): ${scoreB}`);

  if (scoreA > scoreB) {
      console.log('✅ Weighted matching confirmed: Higher priority note has higher score.');
  } else {
      console.error('❌ Weighted matching failed.');
      process.exit(1);
  }

  // Check numeric validity
  // Key match = 1, Value match = 2 => Total 3
  // Score A = 3 * 1.0 = 3
  // Score B = 3 * 0.5 = 1.5
  if (scoreA === 3 && scoreB === 1.5) {
      console.log('✅ Calculations are mathematically correct.');
  } else {
      console.error('❌ Calculation error.');
      process.exit(1);
  }

  console.log('All Weighted Matching tests passed!');
};

runVerification();
