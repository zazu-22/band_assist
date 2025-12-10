import { useEffect, useCallback } from 'react';

/**
 * Detects if the current platform is macOS.
 * Uses navigator.platform with fallback to navigator.userAgent.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  // navigator.platform is deprecated but still widely supported
  // Fall back to userAgent for newer browsers
  return (
    navigator.platform?.toLowerCase().includes('mac') ||
    navigator.userAgent?.toLowerCase().includes('mac')
  );
}

/**
 * Returns the keyboard shortcut hint text for the current platform.
 * Mac: ⌘↵
 * Windows/Linux: Ctrl+↵
 */
export function getSubmitShortcutHint(): string {
  return isMacPlatform() ? '⌘↵' : 'Ctrl+↵';
}

interface UseKeyboardSubmitOptions {
  /** Whether the keyboard shortcut is enabled */
  enabled?: boolean;
  /** Callback to invoke on Cmd/Ctrl+Enter */
  onSubmit: () => void;
}

/**
 * Hook that listens for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
 * and invokes the onSubmit callback.
 *
 * @example
 * ```tsx
 * useKeyboardSubmit({
 *   enabled: !isSubmitting,
 *   onSubmit: () => formRef.current?.requestSubmit(),
 * });
 * ```
 */
export function useKeyboardSubmit({ enabled = true, onSubmit }: UseKeyboardSubmitOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux
      const isModifierPressed = e.metaKey || e.ctrlKey;
      const isEnter = e.key === 'Enter';

      if (isModifierPressed && isEnter) {
        e.preventDefault();
        onSubmit();
      }
    },
    [enabled, onSubmit]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
