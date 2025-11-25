import { useEffect } from 'react';
import { useAppContext } from '../App';

/**
 * Hook to enable keyboard shortcuts for layout controls.
 * - Cmd/Ctrl + B: Toggle sidebar collapse
 */
export const useLayoutShortcuts = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B = toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, setSidebarCollapsed]);
};
