import { PropertyExtractor } from '../core/dist/propertyExtractor.js';
import { parseProperties } from '../core/dist/parsing.js';

// Mock DOM parser for getTextFromHtml since we are in Node.js
// The original core function uses document.createElement which is not available
const getTextFromHtmlMock = (content) => {
    return content.replace(/<[^>]*>/g, ' ');
};

// Mock simulation of `handleContentSave` logic
const simulateContentSave = (content) => {
  const extractor = new PropertyExtractor();

  // 1. Parse explicit properties from content (bracket syntax)
  const explicitProperties = parseProperties(content);

  // 2. Extract implicit properties from plain text
  const plainText = getTextFromHtmlMock(content);
  const implicitProperties = extractor.extractFromText(plainText);

  // 3. Merge properties: Explicit overrides Implicit
  const explicitKeys = new Set(explicitProperties.map(p => p.key));
  const newImplicitProps = implicitProperties.filter(p => !explicitKeys.has(p.key));

  return [...explicitProperties, ...newImplicitProps];
};

const runVerification = () => {
  console.log('Verifying Implicit Property Extraction Logic...');

  // Test 1: Pure Implicit
  console.log('\nTest 1: Pure Implicit Extraction');
  const input1 = "Meeting tomorrow at 5pm";
  const props1 = simulateContentSave(input1);
  console.log(`Input: "${input1}"`);
  console.log('Extracted:', props1.map(p => `${p.key}:${p.values}`));

  if (props1.some(p => p.key === 'date')) {
      console.log('✅ Correctly extracted implicit date.');
  } else {
      console.error('❌ Failed to extract implicit date.');
      process.exit(1);
  }

  // Test 2: Explicit Overrides Implicit
  console.log('\nTest 2: Explicit Overrides Implicit');
  const input2 = "Meeting tomorrow [date:is:2025-01-01]";
  const props2 = simulateContentSave(input2);
  console.log(`Input: "${input2}"`);
  console.log('Extracted:', props2.map(p => `${p.key}:${p.values}`));

  const dateProp = props2.find(p => p.key === 'date');
  if (dateProp && dateProp.values[0] === '2025-01-01') {
      console.log('✅ Explicit date preserved (2025-01-01).');
  } else {
      console.error('❌ Failed to preserve explicit date. Got:', dateProp?.values[0]);
      process.exit(1);
  }

  // Test 3: Mixed Explicit and Implicit (Different Keys)
  console.log('\nTest 3: Mixed Explicit and Implicit');
  const input3 = "Budget is $500 [priority:is:high]";
  const props3 = simulateContentSave(input3);
  console.log(`Input: "${input3}"`);
  console.log('Extracted:', props3.map(p => `${p.key}:${p.values}`));

  if (props3.some(p => p.key === 'budget') && props3.some(p => p.key === 'priority')) {
      console.log('✅ Correctly merged implicit budget and explicit priority.');
  } else {
      console.error('❌ Failed to merge properties.');
      process.exit(1);
  }

  console.log('\nAll Implicit Extraction tests passed!');
};

runVerification();
