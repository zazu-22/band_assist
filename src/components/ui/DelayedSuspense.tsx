import React, { Suspense, useState, useEffect, useTransition, memo } from 'react';

interface DelayedSuspenseProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  /** Minimum time to show the fallback (prevents flash on fast loads). Default: 300ms */
  minDisplayTime?: number;
}

/**
 * A Suspense wrapper that prevents loading state flash on fast connections.
 * Shows the fallback for at least `minDisplayTime` milliseconds to avoid
 * jarring UI flickers when content loads quickly.
 */
export const DelayedSuspense: React.FC<DelayedSuspenseProps> = memo(function DelayedSuspense({
  children,
  fallback,
  minDisplayTime = 300,
}) {
  const [showFallback, setShowFallback] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setShowFallback(false);
      });
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Show fallback until both: minimum time elapsed AND content loaded
  if (showFallback || isPending) {
    return <>{fallback}</>;
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
});

DelayedSuspense.displayName = 'DelayedSuspense';
