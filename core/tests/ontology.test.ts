import { OntologyService } from '../src/ontologyService.js';
import { DEFAULT_ONTOLOGY } from '../src/ontology.default.js';
import { describe, test, expect, beforeEach } from 'vitest';

describe('Enhanced Ontology Tests', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService(DEFAULT_ONTOLOGY);
  });

  describe('attribute retrieval', () => {
    test('should retrieve widget metadata for basic attributes', () => {
      const nameMetadata = ontologyService.getWidgetMetadata('name');
      expect(nameMetadata).toEqual({
        type: 'text-input',
        icon: 'user',
        options: undefined,
        operators: ['is', 'is not']
      });

      const emailMetadata = ontologyService.getWidgetMetadata('email');
      expect(emailMetadata).toEqual({
        type: 'text-input',
        icon: 'send',
        options: undefined,
        operators: ['is', 'is not', 'contains']
      });
    });

    test('should retrieve widget metadata for enhanced attributes', () => {
      const firstNameMetadata = ontologyService.getWidgetMetadata('firstName');
      expect(firstNameMetadata).toEqual({
        type: 'text-input',
        icon: 'user',
        options: undefined,
        operators: ['is', 'is not', 'contains']
      });

      const lastNameMetadata = ontologyService.getWidgetMetadata('lastName');
      expect(lastNameMetadata).toEqual({
        type: 'text-input',
        icon: 'user',
        options: undefined,
        operators: ['is', 'is not', 'contains']
      });
    });

    test('should retrieve widget metadata for enum attributes', () => {
      const statusMetadata = ontologyService.getWidgetMetadata('status');
      expect(statusMetadata?.type).toBe('dropdown');
      expect(statusMetadata?.options).toBeDefined();
      expect(Array.isArray(statusMetadata?.options)).toBe(true);
    });
  });

  describe('attribute type filtering', () => {
    test('should get all string attributes', () => {
      const stringAttrs = ontologyService.getAttributesByType('string');
      expect(stringAttrs.size).toBeGreaterThan(0);
      expect(stringAttrs.has('name')).toBe(true);
      expect(stringAttrs.has('email')).toBe(true);
      expect(stringAttrs.has('firstName')).toBe(true);
      expect(stringAttrs.has('lastName')).toBe(true);
    });

    test('should get all number attributes', () => {
      const numberAttrs = ontologyService.getAttributesByType('number');
      expect(numberAttrs.size).toBeGreaterThan(0);
      expect(numberAttrs.has('price')).toBe(true);
      expect(numberAttrs.has('budget')).toBe(true);
    });

    test('should get all enum attributes', () => {
      const enumAttrs = ontologyService.getAttributesByType('enum');
      expect(enumAttrs.size).toBeGreaterThan(0);
      expect(enumAttrs.has('status')).toBe(true);
      expect(enumAttrs.has('channel')).toBe(true);
    });
  });

  describe('operator-based filtering', () => {
    test('should get attributes with "contains" operator', () => {
      const attrs = ontologyService.getAttributesByOperator('contains');
      expect(attrs.length).toBeGreaterThan(0);
      
      // Verify that some expected attributes have the 'contains' operator
      const containsNames = attrs.map(a => a.key);
      expect(containsNames).toContain('firstName');
      expect(containsNames).toContain('lastName');
      expect(containsNames).toContain('email');
      expect(containsNames).toContain('role');
    });

    test('should get attributes with "is" operator', () => {
      const attrs = ontologyService.getAttributesByOperator('is');
      expect(attrs.length).toBeGreaterThan(0);
      
      // Verify that some expected attributes have the 'is' operator
      const isNames = attrs.map(a => a.key);
      expect(isNames).toContain('name');
      expect(isNames).toContain('email');
      expect(isNames).toContain('phone');
    });
  });

  describe('enum options', () => {
    test('should get enum options for status attribute', () => {
      const options = ontologyService.getEnumOptions('status');
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
      expect(options!.length).toBeGreaterThan(0);
      // Status appears in multiple contexts, so check for some common options
      // The actual options depend on which 'status' attribute is found first
      // Let's just verify that it contains some expected values
      const expectedValues = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived', 'sent', 'delivered', 'read', 'failed'];
      const hasExpected = options!.some(option => expectedValues.includes(option));
      expect(hasExpected).toBe(true);
    });

    test('should get enum options for eventType attribute', () => {
      const options = ontologyService.getEnumOptions('eventType');
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
      expect(options).toContain('meeting');
      expect(options).toContain('conference');
      expect(options).toContain('workshop');
      expect(options).toContain('seminar');
      expect(options).toContain('training');
      expect(options).toContain('social');
      expect(options).toContain('celebration');
      expect(options).toContain('performance');
      expect(options).toContain('sports');
      expect(options).toContain('other');
    });

    test('should return null for non-enum attributes', () => {
      const options = ontologyService.getEnumOptions('name');
      expect(options).toBeNull();
    });
  });

  describe('fuzzy matching', () => {
    test('should find location-related attributes', () => {
      const matches = ontologyService.getFuzzyMatches('loc', 5);
      expect(matches).toContain('location');
      expect(matches.length).toBeLessThanOrEqual(5);
    });

    test('should find time-related attributes', () => {
      const matches = ontologyService.getFuzzyMatches('time', 10);
      expect(matches).toContain('actualTime');
      expect(matches).toContain('deliveryTime');
      expect(matches).toContain('estimatedTime');
      expect(matches).toContain('responseTime');
      expect(matches.length).toBeLessThanOrEqual(10);
    });

    test('should find price-related attributes', () => {
      const matches = ontologyService.getFuzzyMatches('price', 5);
      expect(matches).toContain('price');
      expect(matches).toContain('priceRate');
      expect(matches).toContain('purchasePrice');
      expect(matches.length).toBeLessThanOrEqual(5);
    });
  });

  describe('node retrieval', () => {
    test('should retrieve person node with attributes', () => {
      const personNode = ontologyService.getNode('person');
      expect(personNode).toBeDefined();
      expect(personNode?.id).toBe('person');
      expect(personNode?.attributes).toBeDefined();
      expect(Object.keys(personNode?.attributes || {}).length).toBeGreaterThan(0);
      
      // Check for some expected attributes
      expect(personNode?.attributes?.['name']).toBeDefined();
      expect(personNode?.attributes?.['email']).toBeDefined();
      expect(personNode?.attributes?.['firstName']).toBeDefined();
      expect(personNode?.attributes?.['lastName']).toBeDefined();
    });

    test('should retrieve product node with attributes', () => {
      const productNode = ontologyService.getNode('product');
      expect(productNode).toBeDefined();
      expect(productNode?.id).toBe('product');
      expect(productNode?.attributes).toBeDefined();
      expect(Object.keys(productNode?.attributes || {}).length).toBeGreaterThan(0);
      
      // Check for some expected attributes
      expect(productNode?.attributes?.['name']).toBeDefined();
      expect(productNode?.attributes?.['price']).toBeDefined();
      expect(productNode?.attributes?.['condition']).toBeDefined();
      expect(productNode?.attributes?.['category']).toBeDefined();
    });

    test('should return null for non-existent node', () => {
      const nonExistentNode = ontologyService.getNode('nonexistent');
      expect(nonExistentNode).toBeNull();
    });
  });

  describe('attribute existence', () => {
    test('should confirm attribute exists', () => {
      expect(ontologyService.hasAttribute('name')).toBe(true);
      expect(ontologyService.hasAttribute('email')).toBe(true);
      expect(ontologyService.hasAttribute('firstName')).toBe(true);
      expect(ontologyService.hasAttribute('price')).toBe(true);
    });

    test('should confirm attribute does not exist', () => {
      expect(ontologyService.hasAttribute('nonexistent')).toBe(false);
      expect(ontologyService.hasAttribute('fakeAttribute')).toBe(false);
    });
  });

  describe('operator validation', () => {
    test('should get valid operators for an attribute', () => {
      const operators = ontologyService.getValidOperators('name');
      expect(operators).toEqual(['is', 'is not']);
      
      const emailOperators = ontologyService.getValidOperators('email');
      expect(emailOperators).toEqual(['is', 'is not', 'contains']);
    });

    test('should get only real or imaginary operators', () => {
      const realOperators = ontologyService.getValidOperators('email', 'real');
      expect(realOperators).toEqual(['is']);
      
      const imaginaryOperators = ontologyService.getValidOperators('email', 'imaginary');
      expect(imaginaryOperators).toEqual(['is not', 'contains']);
    });
  });

  describe('overall attribute count', () => {
    test('should have a substantial number of attributes after enhancements', () => {
      const allAttrKeys = ontologyService.getAllAttributeKeys();
      expect(allAttrKeys.length).toBeGreaterThan(100); // Should have many attributes after enhancements
    });
  });
});