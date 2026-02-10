import { describe, it, expect, beforeEach } from 'vitest';
import { MetaphorRegistry, metaphorRegistry } from '../metaphor/MetaphorRegistry';
import { MetaphorMapper, metaphorMapper } from '../metaphor/MetaphorMapper';
import { UIMetaphor } from '../types/metaphor';
import { Note } from '../types/index';
import { generateId } from '../utils/common';

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

describe('MetaphorMapper', () => {
  // Re-initialize registry with defaults for mapper tests
  const registry = new MetaphorRegistry();
  const mapper = new MetaphorMapper(registry);

  it('should infer "conditional-automation" metaphor from properties', () => {
    const note: Note = {
      id: generateId(),
      title: 'Auto Rule',
      content: 'If X then Y',
      tags: [],
      properties: [
        { key: 'if', operator: 'is', values: ['temperature > 30'] },
        { key: 'then', operator: 'is', values: ['turn_on_ac'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'user', identifier: 'test', timestamp: Date.now() },
      privacy: 'private',
      priority: 0
    };

    const metaphor = mapper.mapToMetaphor(note);
    expect(metaphor).toBeDefined();
    expect(metaphor?.id).toBe('conditional-automation');
  });

  it('should infer "scheduled-task" metaphor from properties', () => {
    const note: Note = {
      id: generateId(),
      title: 'Meeting',
      content: 'Meeting tomorrow',
      tags: [],
      properties: [
        { key: 'when', operator: 'is', values: ['tomorrow'] },
        { key: 'do', operator: 'is', values: ['meet_team'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'user', identifier: 'test', timestamp: Date.now() },
      privacy: 'private',
      priority: 0
    };

    const metaphor = mapper.mapToMetaphor(note);
    expect(metaphor).toBeDefined();
    expect(metaphor?.id).toBe('scheduled-task');
  });

  it('should prioritize explicit metaphor property', () => {
    const note: Note = {
      id: generateId(),
      title: 'Forced Metaphor',
      content: 'Force monitor',
      tags: [],
      properties: [
        { key: 'metaphor', operator: 'is', values: ['monitoring-agent'] },
        { key: 'if', operator: 'is', values: ['something'] } // Would otherwise match conditional
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'user', identifier: 'test', timestamp: Date.now() },
      privacy: 'private',
      priority: 0
    };

    const metaphor = mapper.mapToMetaphor(note);
    expect(metaphor).toBeDefined();
    expect(metaphor?.id).toBe('monitoring-agent');
  });

  it('should return null if no metaphor matches', () => {
    const note: Note = {
      id: generateId(),
      title: 'Random Note',
      content: 'Just some text',
      tags: [],
      properties: [
        { key: 'random', operator: 'is', values: ['value'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'user', identifier: 'test', timestamp: Date.now() },
      privacy: 'private',
      priority: 0
    };

    const metaphor = mapper.mapToMetaphor(note);
    expect(metaphor).toBeNull();
  });

  it('should apply metaphor to a note', () => {
    const note: Note = {
      id: generateId(),
      title: 'Apply Test',
      content: 'Test content',
      tags: [],
      properties: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: { type: 'user', identifier: 'test', timestamp: Date.now() },
      privacy: 'private',
      priority: 0
    };

    const metaphor = registry.getMetaphor('conditional-automation')!;
    const updatedNote = mapper.applyMetaphor(note, metaphor);

    const metaphorProp = updatedNote.properties.find(p => p.key === 'metaphor');
    expect(metaphorProp).toBeDefined();
    expect(metaphorProp?.values[0]).toBe('conditional-automation');
  });
});
