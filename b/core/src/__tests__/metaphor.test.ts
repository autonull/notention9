import { describe, it, expect, beforeEach } from 'vitest';
import { MetaphorRegistry, metaphorRegistry } from '../metaphor/MetaphorRegistry';
import { UIMetaphor } from '../types/metaphor';

describe('MetaphorRegistry', () => {
  const testMetaphor: UIMetaphor = {
    id: 'test-metaphor',
    name: 'Test Metaphor',
    description: 'A test metaphor',
    icon: '🧪',
    color: '#000000',
    category: 'test',
    template: '[test:value]',
    properties: [
      {
        name: 'value',
        type: 'string',
        label: 'Value',
        description: 'Test value',
        required: true
      }
    ]
  };

  beforeEach(() => {
    metaphorRegistry.clear();
  });

  it('should be a singleton', () => {
    const instance1 = MetaphorRegistry.getInstance();
    const instance2 = MetaphorRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should register a metaphor', () => {
    metaphorRegistry.registerMetaphor(testMetaphor);
    expect(metaphorRegistry.getMetaphor('test-metaphor')).toEqual(testMetaphor);
  });

  it('should overwrite existing metaphor with same ID', () => {
    metaphorRegistry.registerMetaphor(testMetaphor);

    const updatedMetaphor = { ...testMetaphor, name: 'Updated Test Metaphor' };
    metaphorRegistry.registerMetaphor(updatedMetaphor);

    expect(metaphorRegistry.getMetaphor('test-metaphor')?.name).toBe('Updated Test Metaphor');
  });

  it('should unregister a metaphor', () => {
    metaphorRegistry.registerMetaphor(testMetaphor);
    expect(metaphorRegistry.getMetaphor('test-metaphor')).toBeDefined();

    const result = metaphorRegistry.unregisterMetaphor('test-metaphor');
    expect(result).toBe(true);
    expect(metaphorRegistry.getMetaphor('test-metaphor')).toBeUndefined();
  });

  it('should retrieve all metaphors', () => {
    const metaphor2 = { ...testMetaphor, id: 'test-metaphor-2', name: 'Test 2' };

    metaphorRegistry.registerMetaphor(testMetaphor);
    metaphorRegistry.registerMetaphor(metaphor2);

    const all = metaphorRegistry.getAllMetaphors();
    expect(all.length).toBe(2);
    expect(all).toContainEqual(testMetaphor);
    expect(all).toContainEqual(metaphor2);
  });

  it('should filter by category', () => {
    const metaphor2 = { ...testMetaphor, id: 'test-metaphor-2', category: 'other' };

    metaphorRegistry.registerMetaphor(testMetaphor);
    metaphorRegistry.registerMetaphor(metaphor2);

    const testCategory = metaphorRegistry.getMetaphorsByCategory('test');
    expect(testCategory.length).toBe(1);
    expect(testCategory[0].id).toBe('test-metaphor');

    const otherCategory = metaphorRegistry.getMetaphorsByCategory('other');
    expect(otherCategory.length).toBe(1);
    expect(otherCategory[0].id).toBe('test-metaphor-2');
  });
});
