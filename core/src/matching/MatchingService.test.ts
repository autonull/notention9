import { describe, it, expect } from 'vitest';
import { MatchingService } from './MatchingService';
import { DEFAULT_ONTOLOGY } from '../ontology/ontology.default.js';
import { Property } from '../types';
import { createNote as createTestNote } from '../notes/notes.js';

const matchingService = new MatchingService(DEFAULT_ONTOLOGY);

const createNote = (properties: Property[]) => createTestNote({ properties });

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
      // 'is' operator = fact, other operators = constraint
      const request = createNote([
        prop('role', 'is', 'Designer'),     // Fact (for Offer -> Request)
        prop('skill', 'contains', 'React')  // Constraint (Request -> Offer)
      ]);
      const offer = createNote([
        prop('role', 'is', 'Developer'),    // Fact (for Request -> Offer)
        prop('skill', 'is', 'React')        // Fact (for Offer -> Request)
      ]);

      // matchDirectional uses ALL request.properties as constraints:
      // 1. reqToOffer: request has 2 properties (role:is:Designer, skill:contains:React)
      //    offer has 2 facts (role:is:Developer, skill:is:React)
      //    - role:is:Designer vs role:is:Developer -> no match
      //    - skill:contains:React vs skill:is:React -> match!
      //    score = 1/2 = 0.5, totalConstraints = 2
      //
      // 2. offerToRequest: offerConstraints from request = [skill:contains:React]
      //    requestFacts from request = [role:is:Designer]
      //    request has 1 constraint, offer has 1 fact
      //    - skill:contains:React vs role:is:Designer -> missing (different keys)
      //    score = 0/1 = 0, totalConstraints = 1
      //
      // Total: (0.5*2 + 0*1) / (2+1) = 1/3 = 0.333

      const result = matchingService.matchNotesWithRealVsImaginary(request, offer);
      expect(result.score).toBeCloseTo(0.333, 2);
    });
  });
});
