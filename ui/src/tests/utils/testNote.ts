import type { Note, NoteSource, PrivacyLevel, Property } from '@notention/core';

export function createTestNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString();
  const defaultSource: NoteSource = {
    type: 'user',
    identifier: 'test-user',
    timestamp: Date.now(),
  };
  const defaultPrivacy: PrivacyLevel = 'private';
  const defaultPriority = 0;

  return {
    id: 'test-note-1',
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    properties: [],
    createdAt: now,
    updatedAt: now,
    source: defaultSource,
    privacy: defaultPrivacy,
    priority: defaultPriority,
    ...overrides,
  } as Note;
}

export function createTestProperty(overrides: Partial<Property> = {}): Property {
  return {
    key: 'test-key',
    operator: '=',
    values: ['test-value'],
    ...overrides,
  } as Property;
}

export const defaultTestNote = createTestNote();