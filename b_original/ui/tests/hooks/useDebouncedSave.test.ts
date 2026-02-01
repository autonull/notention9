import { renderHook, act } from '@testing-library/react';
import { useDebouncedSave } from '../../hooks/useDebouncedSave';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '@notention/core';

describe('useDebouncedSave', () => {
    const mockNote: Note = {
        id: '1',
        title: 'Title',
        content: 'Content',
        tags: [],
        properties: [],
        createdAt: '',
        updatedAt: ''
    };
    const onSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize dirtyNote from note prop', () => {
        const { result } = renderHook(() => useDebouncedSave(mockNote, onSave));
        expect(result.current.dirtyNote).toEqual(mockNote);
    });

    it('should update dirtyNote when setDirtyNote is called', () => {
        const { result } = renderHook(() => useDebouncedSave(mockNote, onSave));

        act(() => {
            result.current.setDirtyNote({ ...mockNote, title: 'New Title' });
        });

        expect(result.current.dirtyNote.title).toBe('New Title');
    });

    it('should call onSave when dirtyNote changes after timeout', () => {
        const { result } = renderHook(() => useDebouncedSave(mockNote, onSave));

        act(() => {
            result.current.setDirtyNote({ ...mockNote, title: 'New Title' });
        });

        act(() => {
            vi.runAllTimers();
        });

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
    });
});
