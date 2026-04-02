import { PropertyExtractor } from '../core/dist/propertyExtractor.js';
import { patternRecognitionService } from '../core/dist/patternRecognition.js';
import { getTextFromHtml } from '../core/dist/parsing.js';

// Mock Note
const createNote = (content) => ({
  id: 'test-note-semantic',
  title: 'Test Note',
  content: content,
  tags: [],
  properties: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  public: false,
  priority: 0.5,
  source: { type: 'user', identifier: 'test', timestamp: Date.now() }
});

const runVerification = () => {
  console.log('Verifying Semantic Suggestions...');
  const extractor = new PropertyExtractor();

  // Test 1: Task Intent -> Status Prediction
  console.log('\nTest 1: Task Intent');
  const taskText = "I need to finish the report by tomorrow";
  console.log(`Input: "${taskText}"`);

  const taskProps = extractor.extractFromText(taskText);
  console.log('Extracted Properties:', taskProps.map(p => `${p.key}:${p.values}`));

  const taskNote = createNote(taskText);
  // Augment note with extracted props (simulating UI logic)
  taskNote.properties = taskProps;

  const taskPredictions = patternRecognitionService.predictUserNeeds('user-1', taskNote);
  console.log('Predictions:', taskPredictions.map(p => p.predictedAction));

  if (taskPredictions.some(p => p.predictedAction.includes('[status:is:pending]'))) {
      console.log('✅ Correctly suggested adding status:pending property.');
  } else {
      console.error('❌ Failed to suggest status:pending.');
      process.exit(1);
  }

  // Test 2: Budget Intent -> Priority Prediction
  console.log('\nTest 2: Budget Intent');
  const budgetText = "Project budget is $5000";
  console.log(`Input: "${budgetText}"`);

  const budgetProps = extractor.extractFromText(budgetText);
  console.log('Extracted Properties:', budgetProps.map(p => `${p.key}:${p.values}`));

  if (budgetProps.some(p => p.key === 'budget' && p.values[0] === '5000')) {
      console.log('✅ Correctly extracted budget: 5000');
  } else {
      console.error('❌ Failed to extract budget.');
      process.exit(1);
  }

  const budgetNote = createNote(budgetText);
  budgetNote.properties = budgetProps;

  const budgetPredictions = patternRecognitionService.predictUserNeeds('user-1', budgetNote);
  console.log('Predictions:', budgetPredictions.map(p => p.predictedAction));

  if (budgetPredictions.some(p => p.predictedAction.includes('[priority:is:high]'))) {
      console.log('✅ Correctly suggested adding priority:high property.');
  } else {
      console.error('❌ Failed to suggest priority:high.');
      // Note: This relies on the 'pattern_default_budget' we added.
      process.exit(1);
  }

  console.log('\nAll Semantic Verification tests passed!');
};

runVerification();
