import { describe, it, expect } from 'vitest';
import { matchingService } from './MatchingService';
import { Note, Property } from '../types';

const createNote = (properties: Property[]): Note => ({
  id: 'test-note',
  title: 'Test Note',
  content: 'Content',
  tags: [],
  properties,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: { type: 'user', identifier: 'test', timestamp: Date.now() },
  privacy: 'public',
  priority: 1.0,
});

const prop = (key: string, operator: string, val: string): Property => ({
  key,
  operator,
  values: [val],
});

describe('MatchingService', () => {
  describe('matchNotes', () => {
    it('should match exact constraints', () => {
      const request = createNote([prop('role', 'is', 'Developer')]);
      const offer = createNote([prop('role', 'is', 'Developer')]);

      const result = matchingService.matchNotes(request, offer);
      expect(result.score).toBe(1);
      expect(result.satisfied).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });

    it('should fail on mismatch', () => {
      const request = createNote([prop('role', 'is', 'Developer')]);
      const offer = createNote([prop('role', 'is', 'Designer')]);

      const result = matchingService.matchNotes(request, offer);
      expect(result.score).toBe(0);
      expect(result.satisfied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('matchNotesWithRealVsImaginary', () => {
    it('should match request constraints against offer facts', () => {
      const request = createNote([prop('role', 'is', 'Developer')]); // constraint
      const offer = createNote([prop('role', 'is', 'Developer')]); // fact

      const result = matchingService.matchNotesWithRealVsImaginary(request, offer);
      expect(result.score).toBe(1);
    });

    it('should calculate partial score for mixed satisfaction', () => {
      const request = createNote([
        prop('role', 'is', 'Designer'), // Constraint (Request -> Offer)
        prop('skill', 'is', 'React')    // Fact (for Offer -> Request)
      ]);
      const offer = createNote([
        prop('role', 'is', 'Developer'), // Fact (for Request -> Offer)
        prop('skill', 'contains', 'React') // Constraint (Offer -> Request)
      ]);

      // Request constraints: role (is Designer)
      // Offer constraints: skill (contains React)
      // Total constraints: 2

      // 1. Check Request -> Offer
      // req constraint: role:is:Designer
      // offer fact: role:is:Developer
      // Match? "Designer" vs "Developer" -> No.
      // Satisfied: 0

      // 2. Check Offer -> Request
      // offer constraint: skill:contains:React
      // req fact: skill:is:React
      // Match? "React" contains "React" -> Yes.
      // Satisfied: 1

      // Total satisfied: 1 / 2 = 0.5

      const result = matchingService.matchNotesWithRealVsImaginary(request, offer);

      // If logic counts ALL request properties as constraints (even 'is'), then:
      // Request properties: 2 (role, skill) -> both treated as constraints in requestConstraints list?
      // Line 104: const requestConstraints = request.properties;
      // So request has 2 constraints.

      // Offer properties:
      // Facts: role:is:Developer
      // Constraints: skill:contains:React
      // Offer constraints: 1

      // Total constraints = 2 (req) + 1 (offer) = 3.

      // 1. Req -> Offer
      // Constraint 1: role:is:Designer vs Fact role:is:Developer -> Fail.
      // Constraint 2: skill:is:React vs Fact? No fact for skill in offer. -> Fail.

      // 2. Offer -> Request
      // Constraint 1: skill:contains:React vs Fact skill:is:React -> Pass.

      // Satisfied: 1. Total: 3. Score: 1/3 ~ 0.333

      expect(result.score).toBeCloseTo(0.333, 2);
    });
  });
});
