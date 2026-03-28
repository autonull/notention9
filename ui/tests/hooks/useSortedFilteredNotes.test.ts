import { renderHook } from '@testing-library/react';
import { useSortedFilteredNotes } from '../../hooks/useSortedFilteredNotes';
import { createNote } from '@notention/core';
import type { Note } from '@notention/core';
import { describe, it, expect } from 'vitest';

describe('useSortedFilteredNotes', () => {
  const notes: Note[] = [
    createNote({
      title: 'Alpha',
      content: '<p>Content for alpha</p>',
      updatedAt: '2023-01-01T10:00:00.000Z',
      createdAt: '2023-01-01T10:00:00.000Z',
      tags: ['tag1'],
    }),
    createNote({
      title: 'Beta',
      content: '<p>Content for beta with tag2</p>',
      updatedAt: '2023-01-02T10:00:00.000Z',
      createdAt: '2023-01-02T10:00:00.000Z',
      tags: ['tag2'],
    }),
    createNote({
      title: 'Gamma',
      content: '<p>Gamma text</p>',
      updatedAt: '2023-01-03T10:00:00.000Z',
      createdAt: '2023-01-03T10:00:00.000Z',
    }),
  ];

  it('sorts notes correctly', () => {
    const { result } = renderHook(() =>
      useSortedFilteredNotes(notes, '', 'updatedAt_desc')
    );
    expect(result.current.map((n) => n.title)).toEqual([
      'Gamma',
      'Beta',
      'Alpha',
    ]);

    const { result: resultAsc } = renderHook(() =>
      useSortedFilteredNotes(notes, '', 'updatedAt_asc')
    );
    expect(resultAsc.current.map((n) => n.title)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);
  });

  it('filters by text', () => {
    // "Content" is in Alpha and Beta
    const { result } = renderHook(() =>
      useSortedFilteredNotes(notes, 'Content', 'updatedAt_desc')
    );
    // Sort is desc: Beta (Jan 2), Alpha (Jan 1)
    expect(result.current.map((n) => n.title)).toEqual(['Beta', 'Alpha']);

    // "alpha" -> matches Alpha
    const { result: resultAlpha } = renderHook(() =>
      useSortedFilteredNotes(notes, 'alpha', 'updatedAt_desc')
    );
    expect(resultAlpha.current.map((n) => n.title)).toEqual(['Alpha']);
  });

  it('filters by tag', () => {
    const { result } = renderHook(() =>
      useSortedFilteredNotes(notes, '#tag1', 'updatedAt_desc')
    );
    expect(result.current.map((n) => n.title)).toEqual(['Alpha']);
  });
});
