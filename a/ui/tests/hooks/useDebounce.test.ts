import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDebounce } from '../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should update the value after the delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });
    // Should still be initial immediately after update
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });

  it('should reset the timer if value changes within delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'update1', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender({ value: 'update2', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Total 500ms passed, but timer reset at 250ms, so it should not be update1 or update2 yet (needs another 250ms)
    // Actually, when rerender happens, cleanup runs and clears timeout.
    // So 250ms after first change, we change again. The first timer is cleared.
    // We wait another 250ms. Total 500ms from start. But new timer needs 500ms from 2nd change.
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Now 500ms after second change
    expect(result.current).toBe('update2');
  });
});
