import { useEffect } from 'react';
import { useAppContext } from '../App';

/**
 * Hook to enable keyboard shortcuts for layout controls.
 * - Cmd/Ctrl + B: Toggle sidebar collapse
 */
export const useLayoutShortcuts = () => {
  const { setSidebarCollapsed } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B = toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev); // Use functional update to avoid stale closure
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSidebarCollapsed]); // Only depend on setter (stable reference)
};
