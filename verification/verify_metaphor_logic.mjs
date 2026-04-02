import { MetaphorMapper } from '../core/dist/metaphor/MetaphorMapper.js';
import { MetaphorRegistry } from '../core/dist/metaphor/MetaphorRegistry.js';

// Mock Note factory
const createNote = (id, properties) => ({
  id,
  title: 'Test Note',
  content: 'Test Content',
  tags: [],
  properties,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  public: false,
  priority: 0.5
});

const runVerification = () => {
  console.log('Verifying Metaphor Logic...');
  const registry = MetaphorRegistry.getInstance();
  const mapper = new MetaphorMapper(registry);

  // Test Case 1: Explicit Metaphor
  console.log('Test 1: Explicit Metaphor');
  const note1 = createNote('note1', [
    { key: 'metaphor', operator: 'is', values: ['scheduled-task'] }
  ]);
  const metaphor1 = mapper.mapToMetaphor(note1);
  if (metaphor1?.id === 'scheduled-task') {
    console.log('✅ Explicit metaphor matched correctly.');
  } else {
    console.error('❌ Failed to match explicit metaphor. Got:', metaphor1?.id);
    process.exit(1);
  }

  // Test Case 2: Inferred Metaphor (Scheduled Task)
  console.log('Test 2: Inferred Metaphor (Scheduled Task)');
  const note2 = createNote('note2', [
    { key: 'when', operator: 'is', values: ['tomorrow'] },
    { key: 'do', operator: 'is', values: ['something'] } // 'do' maps to 'action'
  ]);
  // scheduled-task requires 'time' and 'action'
  // 'when' -> 'time', 'do' -> 'action'
  const metaphor2 = mapper.mapToMetaphor(note2);
  if (metaphor2?.id === 'scheduled-task') {
    console.log('✅ Inferred metaphor (Scheduled Task) matched correctly.');
  } else {
    console.error('❌ Failed to match inferred metaphor (Scheduled Task). Got:', metaphor2?.id);
    process.exit(1);
  }

  // Test Case 3: Inferred Metaphor (Conditional Automation)
  console.log('Test 3: Inferred Metaphor (Conditional Automation)');
  const note3 = createNote('note3', [
    { key: 'if', operator: 'is', values: ['condition'] },
    { key: 'then', operator: 'is', values: ['action'] }
  ]);
  // conditional-automation requires 'condition' and 'action'
  // 'if' -> 'condition', 'then' -> 'action'
  const metaphor3 = mapper.mapToMetaphor(note3);
  if (metaphor3?.id === 'conditional-automation') {
    console.log('✅ Inferred metaphor (Conditional Automation) matched correctly.');
  } else {
    console.error('❌ Failed to match inferred metaphor (Conditional Automation). Got:', metaphor3?.id);
    process.exit(1);
  }

  // Test Case 4: No Metaphor
  console.log('Test 4: No Metaphor');
  const note4 = createNote('note4', [
    { key: 'random', operator: 'is', values: ['value'] }
  ]);
  const metaphor4 = mapper.mapToMetaphor(note4);
  if (metaphor4 === null) {
    console.log('✅ No metaphor matched as expected.');
  } else {
    console.error('❌ Incorrectly matched a metaphor. Got:', metaphor4?.id);
    process.exit(1);
  }

  console.log('All Metaphor verification tests passed!');
};

try {
  runVerification();
} catch (e) {
  console.error('Verification failed with exception:', e);
  process.exit(1);
}
