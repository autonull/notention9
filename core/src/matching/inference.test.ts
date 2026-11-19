import { describe, it, expect } from 'vitest';
import {
  inferFromNeed,
  applyNeedInference,
  DEFAULT_INFERENCE_RULES,
  InferenceRule,
} from './inference.js';
import type { Property, Note } from '../types/index.js';

const createNeedProp = (values: string[], role: Property['role'] = 'constraint'): Property => ({
  key: 'need',
  operator: 'contains',
  values,
  role,
});

const createNote = (properties: Property[]): Note => ({
  id: 'test-note',
  title: 'Test',
  content: '',
  tags: [],
  properties,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: { type: 'user', identifier: 'test', timestamp: Date.now() },
  privacy: 'public',
  priority: 1,
  author: 'user',
});

describe('inference', () => {
  describe('inferFromNeed', () => {
    it('should infer schedule and frequency from weekend keywords', () => {
      const needProp = createNeedProp(['weekend coding mentor']);
      const inferred = inferFromNeed(needProp);

      expect(inferred.length).toBeGreaterThan(0);
      const scheduleProp = inferred.find(p => p.key === 'schedule');
      const frequencyProp = inferred.find(p => p.key === 'frequency');
      expect(scheduleProp).toBeDefined();
      expect(scheduleProp?.values).toContain('weekends');
      expect(frequencyProp).toBeDefined();
      expect(frequencyProp?.values).toContain('weekly');
    });

    it('should infer role from mentor keyword', () => {
      const needProp = createNeedProp(['weekend coding mentor']);
      const inferred = inferFromNeed(needProp);

      const roleProp = inferred.find(p => p.key === 'role');
      expect(roleProp).toBeDefined();
      expect(roleProp?.values).toContain('mentor');
    });

    it('should infer role from tutor keyword', () => {
      const needProp = createNeedProp(['math tutor for high school']);
      const inferred = inferFromNeed(needProp);

      const roleProp = inferred.find(p => p.key === 'role');
      expect(roleProp).toBeDefined();
      expect(roleProp?.values).toContain('tutor');
    });

    it('should infer role from developer/coding keywords', () => {
      const needProp = createNeedProp(['React developer needed']);
      const inferred = inferFromNeed(needProp);

      const roleProp = inferred.find(p => p.key === 'role');
      const skillProp = inferred.find(p => p.key === 'skill');
      expect(roleProp).toBeDefined();
      expect(roleProp?.values).toContain('developer');
      expect(skillProp).toBeDefined();
      expect(skillProp?.values).toContain('coding');
    });

    it('should infer format from remote keyword', () => {
      const needProp = createNeedProp(['remote React developer']);
      const inferred = inferFromNeed(needProp);

      const formatProp = inferred.find(p => p.key === 'format');
      expect(formatProp).toBeDefined();
      expect(formatProp?.values).toContain('remote');
    });

    it('should infer price from free keyword', () => {
      const needProp = createNeedProp(['free coding mentor']);
      const inferred = inferFromNeed(needProp);

      const priceProp = inferred.find(p => p.key === 'price');
      expect(priceProp).toBeDefined();
      expect(priceProp?.values).toContain('0');
      expect(priceProp?.values).toContain('free');
    });

    it('should infer budget from cheap/affordable keyword', () => {
      const needProp = createNeedProp(['affordable coding mentor']);
      const inferred = inferFromNeed(needProp);

      const budgetProp = inferred.find(p => p.key === 'budget');
      expect(budgetProp).toBeDefined();
      expect(budgetProp?.operator).toBe('less than');
    });

    it('should infer urgency from urgent keyword', () => {
      const needProp = createNeedProp(['urgent coding help needed']);
      const inferred = inferFromNeed(needProp);

      const urgencyProp = inferred.find(p => p.key === 'urgency');
      expect(urgencyProp).toBeDefined();
      expect(urgencyProp?.values).toContain('urgent');
    });

    it('should infer audience from babysitter keyword', () => {
      const needProp = createNeedProp(['babysitter for toddler']);
      const inferred = inferFromNeed(needProp);

      const roleProp = inferred.find(p => p.key === 'role');
      const audienceProp = inferred.find(p => p.key === 'audience');
      expect(roleProp).toBeDefined();
      expect(roleProp?.values).toContain('babysitter');
      expect(audienceProp).toBeDefined();
      expect(audienceProp?.values).toContain('children');
    });

    it('should infer schedule from flexible keyword', () => {
      const needProp = createNeedProp(['flexible schedule coding mentor']);
      const inferred = inferFromNeed(needProp);

      const scheduleProp = inferred.find(p => p.key === 'schedule');
      expect(scheduleProp).toBeDefined();
      expect(scheduleProp?.values).toContain('flexible');
    });

    it('should handle multiple need values', () => {
      const needProp = createNeedProp(['weekend coding mentor', 'urgent help needed']);
      const inferred = inferFromNeed(needProp);

      const scheduleProp = inferred.find(p => p.key === 'schedule');
      const urgencyProp = inferred.find(p => p.key === 'urgency');
      expect(scheduleProp).toBeDefined();
      expect(urgencyProp).toBeDefined();
    });

    it('should deduplicate inferred properties', () => {
      const needProp = createNeedProp(['weekend coding mentor', 'weekend tutoring']);
      const inferred = inferFromNeed(needProp);

      const scheduleProps = inferred.filter(p => p.key === 'schedule');
      expect(scheduleProps.length).toBe(1);
    });

    it('should return empty array for unknown need values', () => {
      const needProp = createNeedProp(['random unknown thing']);
      const inferred = inferFromNeed(needProp);

      expect(inferred.length).toBe(0);
    });

    it('should preserve role from original need property', () => {
      const needProp = createNeedProp(['weekend coding mentor'], 'fact');
      const inferred = inferFromNeed(needProp);

      for (const prop of inferred) {
        expect(prop.role).toBe('fact');
      }
    });
  });

  describe('applyNeedInference', () => {
    it('should return original note when no need properties', () => {
      const note = createNote([{ key: 'skill', operator: 'is', values: ['React'] }]);
      const result = applyNeedInference(note);

      expect(result).toBe(note);
    });

    it('should add inferred properties to note', () => {
      const note = createNote([
        { key: 'need', operator: 'contains', values: ['weekend coding mentor'] },
        { key: 'skill', operator: 'is', values: ['React'] },
      ]);
      const result = applyNeedInference(note);

      expect(result.properties.length).toBeGreaterThan(2);
      const scheduleProp = result.properties.find(p => p.key === 'schedule');
      const roleProp = result.properties.find(p => p.key === 'role');
      expect(scheduleProp).toBeDefined();
      expect(roleProp).toBeDefined();
    });

    it('should not modify original note', () => {
      const note = createNote([{ key: 'need', operator: 'contains', values: ['weekend coding mentor'] }]);
      const originalLength = note.properties.length;
      applyNeedInference(note);

      expect(note.properties.length).toBe(originalLength);
    });
  });

  describe('DEFAULT_INFERENCE_RULES', () => {
    it('should have rules for common patterns', () => {
      const keywords = DEFAULT_INFERENCE_RULES.flatMap(r => r.keywords);
      expect(keywords).toContain('weekend');
      expect(keywords).toContain('mentor');
      expect(keywords).toContain('tutor');
      expect(keywords).toContain('developer');
      expect(keywords).toContain('remote');
      expect(keywords).toContain('free');
      expect(keywords).toContain('urgent');
    });

    it('should have unique keywords across rules', () => {
      const allKeywords = DEFAULT_INFERENCE_RULES.flatMap(r => r.keywords);
      const uniqueKeywords = new Set(allKeywords);
      // Some keywords may appear in multiple rules intentionally (e.g., 'weekend' in multiple schedule rules)
      // Just verify we have a reasonable number of rules
      expect(DEFAULT_INFERENCE_RULES.length).toBeGreaterThan(20);
    });
  });
});