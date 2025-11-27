import { useState, useRef, useLayoutEffect, useEffect } from 'react';

/**
 * A custom hook for managing state that should be initialized from props
 * but can then be modified independently by the user.
 *
 * When the identity key changes, the state resets to the new initial value.
 * This is the "controlled component with reset" pattern.
 *
 * @param initialValue - The initial value from props (captured via ref to avoid stale closures)
 * @param identityKey - A key that identifies when to reset (e.g., selectedSongId)
 * @returns [state, setState] - Standard state tuple
 *
 * @example
 * // Reset BPM to song's BPM whenever selectedSongId changes
 * const [metronomeBpm, setMetronomeBpm] = useDerivedState(
 *   selectedSong?.bpm ?? 120,
 *   selectedSongId
 * );
 *
 * @warning Do NOT include initialValue in any parent useCallback/useMemo deps -
 * the hook handles capturing the latest value internally via ref.
 */
export function useDerivedState<T>(
  initialValue: T,
  identityKey: string | number | null | undefined
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const prevKeyRef = useRef<string | number | null | undefined>(identityKey);
  const isFirstRenderRef = useRef(true);
  // Track initialValue in a ref to always have the latest value without adding to deps
  const initialValueRef = useRef<T>(initialValue);
  // eslint-disable-next-line react-hooks/refs -- Safe: ref is only read in effect, not during render output
  initialValueRef.current = initialValue;

  // Use useLayoutEffect to sync before paint, avoiding visual flicker
  useLayoutEffect(() => {
    // On first render, just capture the initial key (state already initialized correctly)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevKeyRef.current = identityKey;
      return;
    }

    // Reset state when identity key changes
    if (identityKey !== prevKeyRef.current) {
      prevKeyRef.current = identityKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: "controlled component with reset" pattern
      setState(initialValueRef.current);
    }
    // Note: initialValue intentionally excluded - we capture it via ref to prevent
    // unintended resets when initialValue recalculates but identityKey stays the same
  }, [identityKey]);

  return [state, setState];
}

/**
 * A variant that accepts a factory function for the initial value.
 * Useful when computing the initial value is expensive.
 *
 * @param initialValueFn - Function that returns the initial value
 * @param identityKey - A key that identifies when to reset
 * @returns [state, setState] - Standard state tuple
 *
 * @warning Do NOT include initialValueFn in any parent useCallback/useMemo deps -
 * the hook handles capturing the latest function internally via ref.
 */
export function useDerivedStateLazy<T>(
  initialValueFn: () => T,
  identityKey: string | number | null | undefined
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValueFn);
  const prevKeyRef = useRef<string | number | null | undefined>(identityKey);
  const isFirstRenderRef = useRef(true);
  // Track initialValueFn in a ref to always have the latest function without adding to deps
  const initialValueFnRef = useRef<() => T>(initialValueFn);
  // eslint-disable-next-line react-hooks/refs -- Safe: ref is only read in effect, not during render output
  initialValueFnRef.current = initialValueFn;

  useLayoutEffect(() => {
    // On first render, just capture the initial key (state already initialized correctly)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevKeyRef.current = identityKey;
      return;
    }

    if (identityKey !== prevKeyRef.current) {
      prevKeyRef.current = identityKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: "controlled component with reset" pattern
      setState(initialValueFnRef.current());
    }
    // Note: initialValueFn intentionally excluded - we capture it via ref to prevent
    // unintended resets when the function reference changes but identityKey stays the same
  }, [identityKey]);

  return [state, setState];
}

/**
 * Tracks the previous value of a variable across renders.
 * Returns undefined on the first render.
 *
 * @param value - The value to track
 * @returns The previous value (undefined on first render)
 *
 * @example
 * const prevIsGuitarPro = usePrevious(isGuitarPro);
 * if (prevIsGuitarPro === true && !isGuitarPro) {
 *   // Transitioned from GP to non-GP
 * }
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  // eslint-disable-next-line react-hooks/refs -- Intentional: standard "usePrevious" pattern returns previous render's value
  return ref.current;
}
