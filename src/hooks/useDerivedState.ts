import { useState, useRef, useLayoutEffect, useEffect } from 'react';

/**
 * A custom hook for managing state that should be initialized from props
 * but can then be modified independently by the user.
 *
 * When the identity key changes, the state resets to the new initial value.
 * This is the "controlled component with reset" pattern.
 *
 * @param initialValue - The initial value from props
 * @param identityKey - A key that identifies when to reset (e.g., selectedSongId)
 * @returns [state, setState] - Standard state tuple
 *
 * @example
 * // Reset BPM to song's BPM whenever selectedSongId changes
 * const [metronomeBpm, setMetronomeBpm] = useDerivedState(
 *   selectedSong?.bpm ?? 120,
 *   selectedSongId
 * );
 */
export function useDerivedState<T>(
  initialValue: T,
  identityKey: string | number | null | undefined
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValue);
  const prevKeyRef = useRef<string | number | null | undefined>(identityKey);
  const isFirstRenderRef = useRef(true);

  // Use useLayoutEffect to sync before paint, avoiding visual flicker
  useLayoutEffect(() => {
    // Skip the first render (initial state is already correct)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    // Reset state when identity key changes
    if (identityKey !== prevKeyRef.current) {
      prevKeyRef.current = identityKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: "controlled component with reset" pattern
      setState(initialValue);
    }
  }, [identityKey, initialValue]);

  return [state, setState];
}

/**
 * A variant that accepts a factory function for the initial value.
 * Useful when computing the initial value is expensive.
 *
 * @param initialValueFn - Function that returns the initial value
 * @param identityKey - A key that identifies when to reset
 * @returns [state, setState] - Standard state tuple
 */
export function useDerivedStateLazy<T>(
  initialValueFn: () => T,
  identityKey: string | number | null | undefined
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initialValueFn);
  const prevKeyRef = useRef<string | number | null | undefined>(identityKey);
  const isFirstRenderRef = useRef(true);

  useLayoutEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (identityKey !== prevKeyRef.current) {
      prevKeyRef.current = identityKey;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: "controlled component with reset" pattern
      setState(initialValueFn());
    }
  }, [identityKey, initialValueFn]);

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
