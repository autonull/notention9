import {act, renderHook} from '@testing-library/react';
import {useDebouncedSave} from '../../hooks/useDebouncedSave';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestNote} from '../utils/testNote';

describe('useDebouncedSave', () => {
    const mockNote = createTestNote({
        id: '1',
        title: 'Title',
        content: 'Content',
    });
    const onSave = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize dirtyNote from note prop', () => {
        const {result} = renderHook(() => useDebouncedSave(mockNote, onSave));
        expect(result.current.dirtyNote).toEqual(mockNote);
    });

    it('should update dirtyNote when setDirtyNote is called', () => {
        const {result} = renderHook(() => useDebouncedSave(mockNote, onSave));

        act(() => {
            result.current.setDirtyNote({...mockNote, title: 'New Title'});
        });

        expect(result.current.dirtyNote.title).toBe('New Title');
    });

    it('should call onSave when dirtyNote changes after timeout', () => {
        const {result} = renderHook(() => useDebouncedSave(mockNote, onSave));

        act(() => {
            result.current.setDirtyNote({...mockNote, title: 'New Title'});
        });

        act(() => {
            vi.runAllTimers();
        });

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({title: 'New Title'}));
    });
});
