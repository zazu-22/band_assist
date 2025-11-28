import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDerivedState, useDerivedStateLazy, usePrevious } from './useDerivedState';

describe('useDerivedState', () => {
  describe('initialization', () => {
    it('initializes with provided value', () => {
      const { result } = renderHook(() => useDerivedState(120, 'song-1'));
      expect(result.current[0]).toBe(120);
    });

    it('initializes with object values', () => {
      const initialValue = { bpm: 120, key: 'C' };
      const { result } = renderHook(() => useDerivedState(initialValue, 'song-1'));
      expect(result.current[0]).toEqual({ bpm: 120, key: 'C' });
    });

    it('initializes with null identity key', () => {
      const { result } = renderHook(() => useDerivedState('default', null));
      expect(result.current[0]).toBe('default');
    });

    it('initializes with undefined identity key', () => {
      const { result } = renderHook(() => useDerivedState('default', undefined));
      expect(result.current[0]).toBe('default');
    });
  });

  describe('state updates', () => {
    it('allows state updates independent of props', () => {
      const { result } = renderHook(() => useDerivedState(120, 'song-1'));

      act(() => {
        result.current[1](140);
      });

      expect(result.current[0]).toBe(140);
    });

    it('supports functional updates', () => {
      const { result } = renderHook(() => useDerivedState(100, 'song-1'));

      act(() => {
        result.current[1](prev => prev + 10);
      });

      expect(result.current[0]).toBe(110);
    });

    it('preserves user changes across re-renders with same key', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 120, key: 'song-1' } }
      );

      // User changes the value
      act(() => {
        result.current[1](140);
      });
      expect(result.current[0]).toBe(140);

      // Re-render with same key but different initialValue (simulating parent re-render)
      rerender({ initialValue: 120, key: 'song-1' });

      // User's change should be preserved
      expect(result.current[0]).toBe(140);
    });
  });

  describe('identity key changes', () => {
    it('resets state when identity key changes', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 120, key: 'song-1' } }
      );

      // User changes the value
      act(() => {
        result.current[1](140);
      });
      expect(result.current[0]).toBe(140);

      // Change to a different song
      rerender({ initialValue: 100, key: 'song-2' });

      // State should reset to new initial value
      expect(result.current[0]).toBe(100);
    });

    it('uses latest initialValue when key changes', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 120, key: 'song-1' } }
      );

      // First, change initialValue without changing key (should not reset)
      rerender({ initialValue: 130, key: 'song-1' });
      expect(result.current[0]).toBe(120); // Still original value

      // Now change the key - should use the latest initialValue (130)
      rerender({ initialValue: 130, key: 'song-2' });
      expect(result.current[0]).toBe(130);
    });

    it('does not reset when initialValue changes but key stays same', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 120, key: 'song-1' } }
      );

      // User modifies state
      act(() => {
        result.current[1](150);
      });

      // Parent re-renders with different initialValue but same key
      rerender({ initialValue: 100, key: 'song-1' });

      // User's modification should be preserved
      expect(result.current[0]).toBe(150);
    });

    it('handles transition from null to defined key', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 'none', key: null as string | null } }
      );

      expect(result.current[0]).toBe('none');

      rerender({ initialValue: 'selected', key: 'song-1' });
      expect(result.current[0]).toBe('selected');
    });

    it('handles transition from defined key to null', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 'selected', key: 'song-1' as string | null } }
      );

      act(() => {
        result.current[1]('modified');
      });

      rerender({ initialValue: 'none', key: null });
      expect(result.current[0]).toBe('none');
    });

    it('handles rapid key changes', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 100, key: 'song-1' } }
      );

      // Rapid key changes
      rerender({ initialValue: 110, key: 'song-2' });
      expect(result.current[0]).toBe(110);

      rerender({ initialValue: 120, key: 'song-3' });
      expect(result.current[0]).toBe(120);

      rerender({ initialValue: 130, key: 'song-4' });
      expect(result.current[0]).toBe(130);
    });

    it('handles numeric identity keys', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 'first', key: 1 } }
      );

      expect(result.current[0]).toBe('first');

      rerender({ initialValue: 'second', key: 2 });
      expect(result.current[0]).toBe('second');
    });
  });

  describe('setter stability', () => {
    it('returns stable setter reference', () => {
      const { result, rerender } = renderHook(
        ({ initialValue, key }) => useDerivedState(initialValue, key),
        { initialProps: { initialValue: 120, key: 'song-1' } }
      );

      const firstSetter = result.current[1];

      rerender({ initialValue: 120, key: 'song-1' });

      expect(result.current[1]).toBe(firstSetter);
    });
  });
});

describe('useDerivedStateLazy', () => {
  describe('initialization', () => {
    it('calls initializer function on mount', () => {
      const initializer = vi.fn(() => 120);
      renderHook(() => useDerivedStateLazy(initializer, 'song-1'));

      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('initializes with function result', () => {
      const { result } = renderHook(() =>
        useDerivedStateLazy(() => ({ computed: 'value' }), 'song-1')
      );

      expect(result.current[0]).toEqual({ computed: 'value' });
    });
  });

  describe('lazy evaluation', () => {
    it('does not call initializer on re-render with same key', () => {
      const initializer = vi.fn(() => 120);
      const { rerender } = renderHook(
        ({ init, key }) => useDerivedStateLazy(init, key),
        { initialProps: { init: initializer, key: 'song-1' } }
      );

      // Reset mock to track only subsequent calls
      initializer.mockClear();

      // Re-render with same key
      rerender({ init: initializer, key: 'song-1' });

      expect(initializer).not.toHaveBeenCalled();
    });

    it('calls initializer when key changes', () => {
      const initializer = vi.fn(() => 120);
      const { rerender } = renderHook(
        ({ init, key }) => useDerivedStateLazy(init, key),
        { initialProps: { init: initializer, key: 'song-1' } }
      );

      initializer.mockClear();

      rerender({ init: initializer, key: 'song-2' });

      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('uses latest initializer function when key changes', () => {
      const makeInitializer = (value: number) => () => value;

      const { result, rerender } = renderHook(
        ({ init, key }) => useDerivedStateLazy(init, key),
        { initialProps: { init: makeInitializer(100), key: 'song-1' } }
      );

      expect(result.current[0]).toBe(100);

      // Update initializer reference without changing key
      rerender({ init: makeInitializer(200), key: 'song-1' });
      expect(result.current[0]).toBe(100); // No change

      // Now change key - should use latest initializer
      rerender({ init: makeInitializer(300), key: 'song-2' });
      expect(result.current[0]).toBe(300);
    });
  });

  describe('state updates', () => {
    it('allows state updates independent of initializer', () => {
      const { result } = renderHook(() =>
        useDerivedStateLazy(() => 120, 'song-1')
      );

      act(() => {
        result.current[1](140);
      });

      expect(result.current[0]).toBe(140);
    });

    it('resets to initializer result when key changes', () => {
      const { result, rerender } = renderHook(
        ({ init, key }) => useDerivedStateLazy(init, key),
        { initialProps: { init: () => 120, key: 'song-1' } }
      );

      act(() => {
        result.current[1](999);
      });

      rerender({ init: () => 200, key: 'song-2' });

      expect(result.current[0]).toBe(200);
    });
  });
});

describe('usePrevious', () => {
  describe('initial render', () => {
    it('returns undefined on first render', () => {
      const { result } = renderHook(() => usePrevious(100));
      expect(result.current).toBeUndefined();
    });
  });

  describe('value tracking', () => {
    it('tracks previous values across renders', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: 100 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 200 });
      expect(result.current).toBe(100);

      rerender({ value: 300 });
      expect(result.current).toBe(200);
    });

    it('tracks object references', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: obj1 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: obj2 });
      expect(result.current).toBe(obj1);
    });

    it('tracks boolean transitions', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: false } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: true });
      expect(result.current).toBe(false);

      rerender({ value: false });
      expect(result.current).toBe(true);
    });

    it('tracks null/undefined transitions', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: null as string | null } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 'defined' });
      expect(result.current).toBe(null);

      rerender({ value: null });
      expect(result.current).toBe('defined');
    });
  });

  describe('same value re-renders', () => {
    it('maintains previous value when current value unchanged', () => {
      const { result, rerender } = renderHook(
        ({ value }) => usePrevious(value),
        { initialProps: { value: 100 } }
      );

      rerender({ value: 200 });
      expect(result.current).toBe(100);

      // Re-render with same value
      rerender({ value: 200 });
      expect(result.current).toBe(200);
    });
  });
});
