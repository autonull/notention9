import { describe, it, expect } from 'vitest';
import { PropertyExtractor } from '../propertyExtractor';
import { patternRecognitionService } from '../patternRecognition';
import { Note } from '../types';

describe('Enhanced Semantic Capabilities (Phase 7)', () => {
  const extractor = new PropertyExtractor();
  const userId = 'test-user';

  it('should extract intents from natural language', () => {
    const text = 'Remind me to call Mom';
    const properties = extractor.extractFromText(text);

    const intentProp = properties.find(p => p.key === 'intent');
    expect(intentProp).toBeDefined();
    expect(intentProp?.values).toContain('reminder');
  });

  it('should predict actions based on extracted intents (Default Patterns)', () => {
    // 1. Simulate a note created from text
    const note: Note = {
      id: 'test-note-intent',
      title: 'Call Mom',
      content: 'Remind me to call Mom',
      properties: [
        { key: 'intent', operator: 'is', values: ['reminder'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      source: { type: 'user', identifier: userId, timestamp: Date.now() },
      privacy: 'private',
      priority: 1.0
    };

    // 2. Predict
    const predictions = patternRecognitionService.predictUserNeeds(userId, note);

    // 3. Verify
    expect(predictions.length).toBeGreaterThan(0);
    const reminderPrediction = predictions.find(p => p.predictedAction === 'Create Reminder Task');
    expect(reminderPrediction).toBeDefined();
    expect(reminderPrediction?.confidence).toBeGreaterThan(0.8);
  });

  it('should handle multiple intents correctly', () => {
    const text = 'Remind me to buy milk';
    // "Remind me" -> reminder
    // "buy" -> shopping
    const properties = extractor.extractFromText(text);

    const intentProp = properties.find(p => p.key === 'intent');
    expect(intentProp).toBeDefined();
    // It depends on implementation if it merges values or has multiple properties.
    // The implementation pushes a property if not exists.
    // Let's check how many intent properties or values.

    // Actually, implementation:
    // if (!properties.some(p => p.key === 'intent' && p.values.includes(intent.key))) { ... }
    // It pushes NEW property objects for each intent.

    const intents = properties.filter(p => p.key === 'intent').flatMap(p => p.values);
    expect(intents).toContain('reminder');
    expect(intents).toContain('shopping');
  });
});
